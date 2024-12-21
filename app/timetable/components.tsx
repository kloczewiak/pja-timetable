"use client";

import {
  LectureDetails,
  TemporaryLectureDetails,
  getLectureDetails,
  getSemesters,
  getStudentGroups,
  getStudies,
  getTimetable,
} from "@/app/lib/data";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CalendarCurrentDate,
  CalendarDayView,
  CalendarEvent,
  CalendarNextTrigger,
  CalendarPrevTrigger,
  CalendarTodayTrigger,
  CalendarWeekView,
  Calendar as FullCalendar,
} from "@/components/ui/full-calendar";
import { cn } from "@/lib/utils";
import { format as formatDate, startOfWeek } from "date-fns";
import { pl } from "date-fns/locale";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function Page() {
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [lectures, setLectures] = useState<
    (LectureDetails | TemporaryLectureDetails)[]
  >([]);
  const [date, setDate] = useState<Date>();
  const firstDayOfWeek = useMemo(() => {
    if (!date) return undefined;
    return startOfWeek(date, { weekStartsOn: 1 });
  }, [date ? startOfWeek(date, { weekStartsOn: 1 }).getTime() : undefined]);

  const [viewstate, setViewstate] = useState<string>();
  const [studentGroups, setStudentGroups] = useState<string[]>();

  const semester = searchParams.get("semester");
  const studyName = searchParams.get("study");
  const selectedGroups = searchParams.getAll("groups");

  useEffect(() => {
    if (semester === null || studyName === null || selectedGroups.length === 0)
      throw new Error("Missing semester, study or group");

    setDate(new Date());

    const run = async () => {
      const { viewstate: viewstate1 } = await getSemesters();
      const { viewstate: viewstate2 } = await getStudies(viewstate1, semester);

      const { viewstate: viewstate3, data: groups } = await getStudentGroups(
        viewstate2,
        studyName,
      );

      setViewstate(viewstate3);
      setStudentGroups(groups);
    };
    run();
  }, []);

  useEffect(() => {
    if (!semester || selectedGroups.length === 0)
      throw new Error("Missing semester or group");
    if (!firstDayOfWeek) return;

    const run = async () => {
      if (!studentGroups || !viewstate) return;
      setLoading(true);

      const indexes = selectedGroups.map((g) => studentGroups.indexOf(g));

      const timetable = await getTimetable(viewstate, indexes, {
        year: firstDayOfWeek.getFullYear(),
        month: firstDayOfWeek.getMonth() + 1,
        day: firstDayOfWeek.getDate(),
      });

      if (timetable.data.tempDetails) {
        setLoading(false);
        setLectures(timetable.data.tempDetails);
      } else {
        setLectures([]);
      }

      timetable.data.items.forEach((item) =>
        getLectureDetails(item.id, item.value, timetable.viewstate).then(
          (out) => {
            // console.log(out);
            setLectures((prev) => {
              const withTempRemoved = prev.filter(
                (l) =>
                  !(
                    l.room === out.room &&
                    l.startTime.getTime() === out.startTime.getTime() &&
                    l.endTime.getTime() === out.endTime.getTime() &&
                    l.subjectCode === out.subjectCode &&
                    l.classType === out.classType
                  ),
              );
              return [...withTempRemoved, out];
            });
            setLoading(false);
            return out;
          },
        ),
      );
    };
    run();
  }, [firstDayOfWeek, viewstate, studentGroups]);

  return (
    <div className="flex flex-col gap-5">
      <DisplayCalendar
        lectures={lectures}
        date={date}
        setDate={setDate}
        loading={loading}
      />
    </div>
  );
}

function DisplayCalendar({
  lectures,
  date,
  setDate,
  loading,
}: {
  lectures: (LectureDetails | TemporaryLectureDetails)[];
  date?: Date;
  setDate: (date: Date) => void;
  loading?: boolean;
}) {
  const events: CalendarEvent[] = lectures.map((lecture) => {
    var color: CalendarEvent["color"];
    if (lecture.classType === "Wykład") {
      color = "blue";
    } else if (lecture.classType === "Ćwiczenia") {
      color = "green";
    } else if (lecture.classType === "Lektorat") {
      color = "purple";
    } else {
      color = "pink";
    }

    return {
      id: lecture.subjectCode + lecture.startTime + lecture.endTime,
      start: lecture.startTime,
      end: lecture.endTime,
      title: `${lecture.subjectCode} - ${lecture.classType}\n${lecture.building}/${lecture.room}${lecture.roomDescription ? ` - ${lecture.roomDescription}` : ""}`,
      color: color,
      hover:
        // If lecture is using temporary details, don't show hover
        "lecturers" in lecture
          ? {
              cardProps: { openDelay: 300, closeDelay: 150 },
              contentProps: { className: "p-0 w-80" },
              content: <EventHoverContent lecture={lecture} />,
            }
          : undefined,
    };
  });

  const startWeekOn =
    lectures.length > 0
      ? Math.min(
          ...lectures.map((lecture) => (lecture.startTime.getDay() + 6) % 7),
        )
      : undefined;

  const endWeekOn =
    lectures.length > 0
      ? Math.max(
          ...lectures.map((lecture) => (lecture.startTime.getDay() + 6) % 7),
        )
      : undefined;

  return (
    <>
      <div className="mx-auto w-full max-w-sm md:hidden">
        <FullCalendar
          events={events}
          locale={pl}
          date={date}
          view={"day"}
          onDateChange={setDate}
          hourDisplay={{ start: 6, count: 16 }}
        >
          <div className="flex h-dvh flex-col p-2 pt-0">
            <Link
              href="/"
              className="flex items-center cursor-pointer h-10 hover:text-foreground/60 transition-colors"
            >
              <ArrowLeft />
              <div>Wróć do wyboru grup</div>
            </Link>
            <div className={cn("flex-1 relative basis-full max-w-full")}>
              {/* TODO: Implement this with framer motion */}
              {/* <div */}
              {/*   className={cn( */}
              {/*     "absolute inset-0 -inset-x-6 transition-opacity duration-200 opacity-0 flex items-center justify-center z-50 backdrop-blur-sm", */}
              {/*     loading && "opacity-100 transition-none", */}
              {/*   )} */}
              {/* > */}
              {/*   <LoaderCircle className="animate-spin" /> */}
              {/* </div> */}

              <CalendarDayView />
            </div>
            <div className="flex flex-col items-center gap-2">
              <CalendarCurrentDate />
              <div className="flex items-center gap-2">
                <CalendarPrevTrigger>
                  <ChevronLeft size={20} />
                  <span className="sr-only">Poprzedni</span>
                </CalendarPrevTrigger>

                <CalendarTodayTrigger>Dzisiaj</CalendarTodayTrigger>

                <CalendarNextTrigger>
                  <ChevronRight size={20} />
                  <span className="sr-only">Nastepny</span>
                </CalendarNextTrigger>
              </div>
            </div>
          </div>
        </FullCalendar>
      </div>
      <div className="hidden md:block p-4 h-dvh">
        <FullCalendar
          events={events}
          locale={pl}
          date={date}
          view={"week"}
          onDateChange={setDate}
          hourDisplay={{ start: 6, count: 16 }}
        >
          <div className="flex h-full flex-col gap-4">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="flex items-center cursor-pointer h-full hover:text-foreground/60 transition-colors"
              >
                <ArrowLeft />
                <div>Wróć do wyboru grup</div>
              </Link>
              <span className="flex-1" />

              <CalendarCurrentDate />

              <CalendarPrevTrigger>
                <ChevronLeft size={20} />
                <span className="sr-only">Poprzedni</span>
              </CalendarPrevTrigger>

              <CalendarTodayTrigger>Dzisiaj</CalendarTodayTrigger>

              <CalendarNextTrigger>
                <ChevronRight size={20} />
                <span className="sr-only">Nastepny</span>
              </CalendarNextTrigger>
            </div>

            <div
              className={cn(
                "flex-1 relative transition-[filter] basis-full self-center w-full",
                loading && "blur transition-none",
              )}
              style={{
                maxWidth:
                  endWeekOn !== undefined && startWeekOn !== undefined
                    ? `${(endWeekOn - startWeekOn + 1) * 250}px`
                    : "100%",
              }}
            >
              <CalendarWeekView startOnDay={startWeekOn} endOnDay={endWeekOn} />
            </div>
          </div>
        </FullCalendar>
      </div>
    </>
  );
}

function EventHoverContent({ lecture }: { lecture: LectureDetails }) {
  return (
    <>
      <CardHeader className="p-4 space-y-0.5">
        <CardTitle className="text-lg leading-6">
          {lecture.subjectName}
        </CardTitle>
        <CardDescription>{lecture.classType}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 grid grid-cols-[auto,_1fr] gap-x-2">
        <EventHoverProperty
          label={getLecturerName(
            lecture.classType,
            lecture.lecturers.length > 1,
          )}
          value={lecture.lecturers.map(
            (lecturer) => `${lecturer.lastName} ${lecturer.firstName}`,
          )}
        />
        <EventHoverProperty
          label="Sala"
          value={`${lecture.building}/${lecture.room}${
            lecture.roomDescription ? ` - ${lecture.roomDescription}` : ""
          }`}
        />
        <EventHoverProperty
          label="Data"
          value={formatDate(lecture.startTime, "dd MMMM yyyy", {
            locale: pl,
          })}
        />
        <EventHoverProperty
          label="Godzina"
          value={
            formatDate(lecture.startTime, "HH:mm", { locale: pl }) +
            " - " +
            formatDate(lecture.endTime, "HH:mm", { locale: pl })
          }
        />
        <EventHoverProperty
          label="Czas trwania"
          value={`${lecture.duration} min`}
        />
        <EventHoverProperty
          label={lecture.groups.length > 1 ? "Grupy" : "Grupa"}
          value={lecture.groups}
        />
        <EventHoverProperty
          label={"Liczba osób"}
          value={
            lecture.studentCount.ITN
              ? [
                  `Normalne: ${lecture.studentCount.normal}`,
                  `ITN: ${lecture.studentCount.ITN}`,
                ]
              : lecture.studentCount.normal
          }
        />
        {lecture.MSTeamsCode && (
          <EventHoverProperty
            label="Kod MS Teams"
            value={lecture.MSTeamsCode}
          />
        )}
      </CardContent>
    </>
  );
}

function getLecturerName(classType: string, plural: boolean = false) {
  switch (classType) {
    case "Ćwiczenia":
      return plural ? "Ćwiczeniowcy" : "Ćwiczeniowiec";
    case "Wykład":
      return plural ? "Wykładowcy" : "Wykładowca";
    case "Lektorat":
      return plural ? "Lektorzy" : "Lektor";
    default:
      return plural ? "Dydaktycy" : "Dydaktyk";
  }
}

function EventHoverProperty({
  label,
  value,
}: {
  label: string;
  value: string | number | (string | number)[];
}) {
  var content: React.ReactNode;

  if (Array.isArray(value)) {
    content =
      value.length > 1 ? (
        <div className="flex flex-col pt-0.5">
          {value.map((line) => (
            <p key={line} className="leading-5">
              {line}
            </p>
          ))}
        </div>
      ) : (
        <p>{value[0]}</p>
      );
  } else {
    content = <p>{value}</p>;
  }

  return (
    <>
      <p className="font-medium text-right">{label}</p>
      {content}
    </>
  );
}
