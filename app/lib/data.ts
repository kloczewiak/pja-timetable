"use server";
// "use server" because there would be a CORS error if we tried to fetch this client-side

import { fromZonedTime } from "date-fns-tz";
import { HTMLElement, Node as ParserNode, parse } from "node-html-parser";
import {
  lectureDetailsPayload,
  stringifyPayload,
  studentGroupsPayload,
  studiesPayload,
  timetableWithDatePayload,
} from "./payloads";
import {
  addDays,
  addMinutes,
  parse as parseDate,
  setHours,
  setMinutes,
} from "date-fns";

export async function getSemesters(): Promise<WithViewstate<string[]>> {
  const response = await fetch(
    `https://planzajec.pjwstk.edu.pl/PlanGrupy.aspx`,
    { cache: "no-cache" },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch semesters");
  }

  const text = await response.text();
  const doc = parse(text);

  const viewstate = doc.querySelector("#__VIEWSTATE")?.getAttribute("value");

  const items = doc.querySelectorAll(
    "#ctl00_ContentPlaceHolder1_SemestrComboBox_DropDown ul > li",
  );

  const semesters = items.map((item) => item.textContent ?? "");
  return {
    viewstate: viewstate ?? "",
    data: semesters,
  };
}

/**
 * @param viewstate - viewstate obtained from getSemesters
 */
export async function getStudies(
  viewstate: string,
  semester: string,
): Promise<WithViewstate<string[]>> {
  const payload = studiesPayload(viewstate, semester);
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
    throw new Error("Failed to fetch groups");
  }

  const text = await response.text();
  const doc = parse(text);
  const items = doc.querySelectorAll(
    "#ctl00_ContentPlaceHolder1_StudiaComboBox_DropDown ul > li",
  );

  const groups = items.map((item) => item.textContent ?? "");
  return {
    viewstate: getViewstate(text),
    data: groups,
  };
}

export type WithViewstate<T> = {
  viewstate: string;
  data: T;
};

export async function getStudentGroups(
  viewstate: string,
  studies: string,
): Promise<WithViewstate<string[]>> {
  const payload = studentGroupsPayload(viewstate, studies);

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
  const doc = parse(text);
  const items = doc.querySelectorAll(
    "#ctl00_ContentPlaceHolder1_GrupyListBox ul > li",
  );

  const groups = items.map((item) => item.textContent ?? "");
  return {
    viewstate: getViewstate(text),
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
  groups: number[],
  date?: { year: number; month: number; day: number },
): Promise<Timetable> {
  // INFO: Sometimes nothing is returned with this payload
  // e.g. for "Zarządzanie informacją niestacjonarne"
  // 1w, 11c, 112l, P.TEM 1w, P.TEM 11c, P.BHP 1w
  // This also happens on gakko so probably not fixable
  const payload = timetableWithDatePayload(viewstate, groups, date);

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
  const studentCountSplit = lecture
    .find((n) => n.name === "Liczba studentów")
    ?.value.split(" ");
  const studentCount: StudentCount = studentCountSplit
    ? {
        normal: parseInt(studentCountSplit[0]),
        ITN: parseInt(studentCountSplit[1]),
      }
    : {
        normal: -1,
        ITN: -1,
      };

  const subjectName =
    lecture.find((n) => n.name === "Nazwy przedmiotów")?.value ?? "";
  const subjectCode =
    lecture.find((n) => n.name === "Kody przedmiotów")?.value ?? "";
  const classType = (lecture
    .find((n) => n.name.includes("Typ"))
    ?.value.toLowerCase() ?? "") as ClassType;
  const groups =
    lecture.find((n) => n.name.includes("Grupy"))?.value.split(", ") ?? [];

  const lecturers = lecture
    .find((n) => n.name === "Dydaktycy" || n.name === "Osoba rezerwująca")
    ?.value.split(", ")
    .map((lecturer) => {
      const [lastName, firstName] = lecturer.split(" ");
      return { lastName, firstName };
    }) ?? [{ lastName: "", firstName: "" }];

  // lecture[6] is for building but it's badly formatted

  const asdf = lecture.find((n) => n.name === "Sala")?.value;
  const [building, roomAndDescription] = asdf?.split("/") ?? ["", " "];

  const [room, roomDescription] = roomAndDescription.split(/ (.*)/);

  const classDateString = lecture.find((n) => n.name === "Data zajęć")?.value;
  if (!classDateString) throw new Error("No class date found");
  const classDate = parseDate(classDateString, "dd.MM.yyyy", new Date());

  const startTimeString = lecture.find(
    (n) => n.name === "Godz. rozpoczęcia",
  )?.value;
  if (!startTimeString) throw new Error("No class start time found");
  const startTime = fromZonedTime(
    parseDate(startTimeString, "HH:mm:ss", classDate),
    "Europe/Warsaw",
  );

  const endTimeString = lecture.find(
    (n) => n.name === "Godz. zakończenia",
  )?.value;
  if (!endTimeString) throw new Error("No class end time found");
  const endTime = fromZonedTime(
    parseDate(endTimeString, "HH:mm:ss", classDate),
    "Europe/Warsaw",
  );

  const durationString = lecture.find((n) => n.name === "Czas trwania")?.value;
  // TODO: Calculate fallback from start and end time
  const duration = durationString
    ? parseInt(durationString.replace(" min", ""))
    : 60;

  const MSTeamsCode =
    lecture.find((n) => n.name === "Kod MS Teams")?.value ?? "";

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
      const containers = td.querySelectorAll(".rsApt.rsAptSubject.rsAptSimple");
      containers.forEach((container) => {
        const hourDecimal = trIndex / 2 + 6;
        const hourFraction = hourDecimal % 1;
        const hour = hourDecimal - hourFraction;

        const additionalMinutes = hourFraction * 60;

        // Calculating start time based on position
        const top = container.getAttribute("style")?.match(/top:(\d+)px/);
        const topValue = top ? parseInt(top[1]) : 0;

        const trHeight = tr.getAttribute("style")?.match(/height:(\d+)px/);
        const trHeightValue = trHeight ? parseInt(trHeight[1]) : 0;

        const estimatedMinutes =
          Math.round((topValue / trHeightValue) * 2) * 15;

        const minutes = estimatedMinutes + additionalMinutes;

        const startTime = fromZonedTime(
          setHours(setMinutes(adjustedDay, minutes), hour),
          "Europe/Warsaw",
        );

        // Calculating end time
        const height = container.getAttribute("style")?.match(/height:(\d+)px/);
        const heightValue = height ? parseInt(height[1]) : 0;

        const duration = Math.round((heightValue / trHeightValue) * 2) * 15;
        const endTime = addMinutes(startTime, duration);

        const content = container.querySelector(".rsAptContent");
        if (!content) return;

        const text = getTextNode(content.childNodes);

        let classType;
        let subjectCode;
        let rest;
        if (text.includes("Egzamin")) {
          classType = "egzamin";
          const nameOfLecturerMatch = text.match(
            / ([\wąćęłńóśżź]+? [\wąćęłńóśżź]+?) s\./,
          );
          if (!nameOfLecturerMatch) return;

          const rest2 = text.replace(nameOfLecturerMatch[1], "").trim();
          const subjectName = rest2.match(/(.+?) +s\./);

          if (!subjectName) return;
          subjectCode = subjectName[1]
            .replace("Egzamin ", "")
            .split(" ")
            .filter((s) => s.length > 2)
            .map((s) => s[0].toUpperCase())
            .join("");
          rest = rest2.replace(subjectName[1], "").trim();
        } else {
          const subjectCodeMatch = text.match(/.+?( )/);
          if (!subjectCodeMatch) return;

          subjectCode = subjectCodeMatch[0].trim();
          const rest2 = text.replace(subjectCode, "").trim();
          const classTypeMatch = rest2.match(/.+?( )/);
          if (!classTypeMatch) return;
          classType = classTypeMatch[0].trim().toLowerCase();
          rest = rest2.replace(classType, "").trim();
        }

        const buildingMatch = rest.match(/s. *([^ ]+)/);
        if (!buildingMatch) return;

        const [building, room] = buildingMatch[1].split("/");

        const roomDescriptionMatch = rest.match(/s. *.+? (.+)/);
        const roomDescription = roomDescriptionMatch?.[1] ?? "";

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
  });

  return elements;
}

function getViewstate(text: string): string {
  const regexViewstate = text.match(/(?:__VIEWSTATE|)\/w[^\|]+/m);
  return regexViewstate ? regexViewstate[0].toString() : "viewstate not found";
}
