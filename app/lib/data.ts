"use server";
// "use server" because there would be a CORS error if we tried to fetch this client-side

import { HTMLElement, Node as ParserNode, parse } from "node-html-parser";
import {
  lectureDetailsPayload,
  stringifyPayload,
  studentGroupsPayload,
  timetableWithDatePayload,
} from "./payloads";
import {
  addDays,
  addMinutes,
  parse as parseDate,
  setHours,
  setMinutes,
} from "date-fns";

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

export type WithViewstate<T> = {
  viewstate: string;
  data: T;
};

export async function getStudentGroups(
  studies: string,
): Promise<WithViewstate<string[]>> {
  // TODO: This should have viewstate as a parameter
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

export type TimetableData = {
  items: TimetableItem[];
  tempDetails?: TemporaryLectureDetails[];
};

export type Timetable = WithViewstate<TimetableData>;

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
  const payload = timetableWithDatePayload(viewstate, studies, groups, date);

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
    data: {
      items: data,
      tempDetails: parseTemporaryLectureDetails(text),
    },
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

export type LectureDetails = {
  studentCount: StudentCount;
  subjectName: string;
  subjectCode: string;
  classType: ClassType;
  groups: string[];
  lecturers: Lecturer[];
  building: string;
  room: string;
  roomDescription?: string;
  startTime: Date;
  endTime: Date;
  /** Duration in minutes */
  duration: number;
  MSTeamsCode: string;
};

export type Lecturer = {
  firstName: string;
  lastName: string;
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

  const lecturers = lecture[5].value.split(", ").map((lecturer) => {
    const [lastName, firstName] = lecturer.split(" ");
    return { lastName, firstName };
  });

  // lecture[6] is for building but it's badly formatted

  const [building, rest] = lecture[7].value.split(/[ /](.*)/);
  const room = rest.match(/\d+/)?.[0] ?? "";
  const roomDescription =
    rest.replace(room, "").trim().replace("  ", " ") || undefined;

  const classDate = parseDate(lecture[8].value, "dd.MM.yyyy", new Date());

  const startTime = parseDate(lecture[9].value, "HH:mm:ss", classDate);
  const endTime = parseDate(lecture[10].value, "HH:mm:ss", classDate);

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
    roomDescription,
    startTime,
    endTime,
    duration,
    MSTeamsCode,
  };
}

export type TemporaryLectureDetails = {
  startTime: Date;
  endTime: Date;
  subjectCode: string;
  classType: string;
  building: string;
  room: string;
  roomDescription?: string;
  /** Duration in minutes */
  duration: number;
};

function parseTemporaryLectureDetails(
  text: string,
): TemporaryLectureDetails[] | undefined {
  const doc = parse(text);
  const table = doc.querySelector("table.rsContentTable");
  if (!table) return;

  // const dateH2 = doc.querySelector("h2");
  // console.log(dateH2);
  // if (!dateH2) return;
  // const dateText = getTextNode(dateH2.childNodes);
  const firstDayText = doc.text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!firstDayText) return;
  const firstDayOfWeek = parseDate(firstDayText[0], "dd.MM.yyyy", new Date());

  const trs = table.childNodes
    .filter((n) => n instanceof HTMLElement)
    .filter((node) => node.rawTagName === "tr");

  const elements: TemporaryLectureDetails[] = [];

  trs.forEach((tr, trIndex) => {
    const tds = tr.childNodes
      .filter((n) => n instanceof HTMLElement)
      .filter((node) => node.rawTagName === "td");
    tds.forEach((td, tdIndex) => {
      const adjustedDay = addDays(firstDayOfWeek, tdIndex);

      const container = td.querySelector(".rsApt.rsAptSubject.rsAptSimple");
      if (!container) {
        return;
      }
      const hourDecimal = trIndex / 2 + 6;
      const hourFraction = hourDecimal % 1;
      const hour = hourDecimal - hourFraction;

      const additionalMinutes = hourFraction * 60;

      // Calculating start time based on position
      const top = container.getAttribute("style")?.match(/top:(\d+)px/);
      const topValue = top ? parseInt(top[1]) : 0;

      const trHeight = tr.getAttribute("style")?.match(/height:(\d+)px/);
      const trHeightValue = trHeight ? parseInt(trHeight[1]) : 0;

      const estimatedMinutes = Math.round((topValue / trHeightValue) * 2) * 15;

      const minutes = estimatedMinutes + additionalMinutes;

      const startTime = setHours(setMinutes(adjustedDay, minutes), hour);

      // Calculating end time
      const height = container.getAttribute("style")?.match(/height:(\d+)px/);
      const heightValue = height ? parseInt(height[1]) : 0;

      const duration = Math.round((heightValue / trHeightValue) * 2) * 15;
      const endTime = addMinutes(startTime, duration);

      const content = container.querySelector(".rsAptContent");
      if (!content) return;

      const text = getTextNode(content.childNodes);
      const subjectCodeMatch = text.match(/.+?( )/);
      if (!subjectCodeMatch) return;
      const subjectCode = subjectCodeMatch[0].trim();

      const rest = text.replace(subjectCode, "").trim();

      const classTypeMatch = rest.match(/.+?( )/);
      if (!classTypeMatch) return;
      const classType = classTypeMatch[0].trim();

      const rest2 = rest.replace(classType, "").trim();

      const [buildingWithPrefix, rest3] = rest2.split(/[ /](.*)/);
      const room = rest3.match(/\d+/)?.[0] ?? "";
      const roomDescription =
        rest3.replace(room, "").trim().replace("  ", " ") || undefined;
      const building = buildingWithPrefix.slice(2);

      elements.push({
        startTime,
        endTime,
        subjectCode,
        classType,
        building,
        room,
        roomDescription,
        duration,
      });
    });
  });

  console.log(elements.length);

  return elements;
}

function getViewstate(text: string): string {
  const regexViewstate = text.match(/(?:__VIEWSTATE|)\/w[^\|]+/m);
  return regexViewstate ? regexViewstate[0].toString() : "viewstate not found";
}
