"use server";
// "use server" because there would be a CORS error if we tried to fetch this client-side

import { Node as ParserNode, parse } from "node-html-parser";
import {
  lectureDetailsPayload,
  stringifyPayload,
  studentGroupsPayload,
  timetableWithDatePayload,
} from "./payloads";

export async function getStudies() {
  const response = await fetch(
    `https://planzajec.pjwstk.edu.pl/PlanGrupy.aspx`,
    { cache: "no-cache" },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch groups");
  }

  const text = await response.text();
  const doc = parse(text);
  const items = doc.querySelectorAll(
    "#ctl00_ContentPlaceHolder1_StudiaComboBox_DropDown ul > li",
  );

  const groups = items.map((item) => item.textContent ?? "");
  return groups;
}

export async function getSemesters() {
  const response = await fetch(
    `https://planzajec.pjwstk.edu.pl/PlanGrupy.aspx`,
    { cache: "no-cache" },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch semesters");
  }

  const text = await response.text();
  const doc = parse(text);
  const items = doc.querySelectorAll(
    "#ctl00_ContentPlaceHolder1_SemestrComboBox_DropDown ul > li",
  );
  const semesters = items.map((item) => item.textContent ?? "");
  return semesters;
}

export type WithViewstate<T> = {
  viewstate: string;
  data: T;
};

export async function getStudentGroups(
  studies: string,
): Promise<WithViewstate<string[]>> {
  const payload = studentGroupsPayload(studies);

  const response = await fetch(
    `https://planzajec.pjwstk.edu.pl/PlanGrupy.aspx`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
      },
      body: stringifyPayload(payload),
      cache: "no-cache",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch student group");
  }

  const text = await response.text();
  const newViewstate = getViewstate(text);
  const doc = parse(text);
  const items = doc.querySelectorAll(
    "#ctl00_ContentPlaceHolder1_GrupyListBox ul > li",
  );

  const groups = items.map((item) => item.textContent ?? "");
  return {
    viewstate: newViewstate,
    data: groups,
  };
}

export type TimetableItem = {
  text: string;
  id: string;
  value: string;
};

export type Timetable = WithViewstate<TimetableItem[]>;

export async function getTimetable(
  viewstate: string,
  studies: string,
  groups: number[],
  date?: { year: number; month: number; day: number },
): Promise<Timetable> {
  // INFO: Sometimes nothing is returned with this payload
  // e.g. for "Zarządzanie informacją niestacjonarne"
  // 1w, 11c, 112l, P.TEM 1w, P.TEM 11c, P.BHP 1w
  // This also happens on gakko so probably not fixable
  const payload = timetableWithDatePayload(
    viewstate,
    "2024/2025 zimowy",
    studies,
    groups,
    date,
  );

  const response = await fetch(
    `https://planzajec.pjwstk.edu.pl/PlanGrupy.aspx`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
      },
      body: stringifyPayload(payload),
      cache: "no-cache",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch timetable");
  }

  const text = await response.text();
  const regexViewstate = text.match(/(?:__VIEWSTATE|)\/w[^\|]+/m);
  const newViewstate = regexViewstate
    ? regexViewstate[0].toString()
    : "viewstate not found";
  const doc = parse(text);
  const items = doc.querySelectorAll(".rsApt.rsAptSubject.rsAptSimple");

  const data = items.map((item) => {
    const content = item.querySelector(".rsAptContent");
    var text;
    if (content) {
      text = getTextNode(content.childNodes);
    } else {
      throw new Error("No content in lecture");
    }

    const id = item.getAttribute("id") ?? "";
    const value = item.getAttribute("title")?.slice(0, -1) ?? "";
    return {
      text,
      id,
      value,
    };
  });
  return {
    viewstate: newViewstate,
    data,
  };
}

function getTextNode(childNodes: ParserNode[]) {
  var str = "";
  for (const child of childNodes) {
    // 3 is a text node
    if (child.nodeType === 3) {
      str += child.textContent;
    }
  }

  return str.trim();
}

export type StudentCount = {
  normal: number;
  ITN: number;
};

export type ClassType = "Ćwiczenia" | "Wykład" | "Lektorat" | string;

export type Time = {
  hour: number;
  minute: number;
};

export type LectureDetails = {
  studentCount: StudentCount;
  subjectName: string;
  subjectCode: string;
  classType: ClassType;
  groups: string[];
  lecturers: string[];
  building: string;
  room: string;
  classDate: string;
  startTime: Time;
  endTime: Time;
  /** Duration in minutes */
  duration: number;
  MSTeamsCode: string;
};

export async function getLectureDetails(
  lectureId: string,
  value: string,
  viewstate: string,
): Promise<LectureDetails> {
  const payload = lectureDetailsPayload(lectureId, value, viewstate);

  const response = await fetch(
    `https://planzajec.pjwstk.edu.pl/PlanGrupy.aspx`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
      },
      body: stringifyPayload(payload),
      next: { revalidate: 3600 },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch lecture details");
  }

  const text = await response.text();
  const doc = parse(text);

  const tableRows = doc.querySelectorAll("table > tr");

  const items = tableRows.map((row) => {
    const cols = row.querySelectorAll("td");
    return {
      name: cols[0].textContent.replace(":", "").trim(),
      value: cols[1].textContent.trim(),
    };
  });

  return parseLectureDetails(items);

  // return items;

  // return {
  //   id: lectureId,
  //   title: "Lecture title",
  //   lecturer: "Lecturer name",
  //   room: "Room",
  //   type: "Lecture",
  // };
}

function parseLectureDetails(
  lecture: { name: string; value: string }[],
): LectureDetails {
  const studentCountSplit = lecture[0].value.split(" ");
  const studentCount: StudentCount = {
    normal: parseInt(studentCountSplit[0]),
    ITN: parseInt(studentCountSplit[1]),
  };

  const subjectName = lecture[1].value;
  const subjectCode = lecture[2].value;
  const classType = lecture[3].value as ClassType;
  const groups = lecture[4].value.split(", ");
  const lecturers = lecture[5].value.split(", ");
  // TODO: Maybe just use the first character
  const building = lecture[6].value;
  const room = lecture[7].value;
  const classDate = lecture[8].value;

  const startTimeSplit = lecture[9].value.split(":");
  const startTime: Time = {
    hour: parseInt(startTimeSplit[0]),
    minute: parseInt(startTimeSplit[1]),
  };

  const endTimeSplit = lecture[10].value.split(":");
  const endTime: Time = {
    hour: parseInt(endTimeSplit[0]),
    minute: parseInt(endTimeSplit[1]),
  };

  const duration = parseInt(lecture[11].value.replace(" min", ""));
  const MSTeamsCode = lecture[12].value;

  return {
    studentCount,
    subjectName,
    subjectCode,
    classType,
    groups,
    lecturers,
    building,
    room,
    classDate,
    startTime,
    endTime,
    duration,
    MSTeamsCode,
  };
}

function getViewstate(text: string): string {
  const regexViewstate = text.match(/(?:__VIEWSTATE|)\/w[^\|]+/m);
  return regexViewstate ? regexViewstate[0].toString() : "viewstate not found";
}
