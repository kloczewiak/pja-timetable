"use client";

import {
  LectureDetails,
  getLectureDetails,
  getStudentGroups,
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
import { useEffect, useState } from "react";

export default function Page() {
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [lectures, setLectures] = useState<LectureDetails[]>([]);
  const [date, setDate] = useState<Date>();

  const startDate = date && startOfWeek(date, { weekStartsOn: 1 }).getTime();

  const studyName = searchParams.get("study");
  const selectedGroups = searchParams.getAll("groups");

  useEffect(() => {
    setDate(new Date());
  }, []);

  useEffect(() => {
    if (studyName === null || selectedGroups.length === 0)
      throw new Error("Missing study or group");
    if (!date) return;

    const run = async () => {
      setLoading(true);
      const { viewstate, data: groups } = await getStudentGroups(studyName);
      const indexes = selectedGroups.map((g) => groups.indexOf(g));

      const timetable = await getTimetable(viewstate, studyName, indexes, {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
      });

      setLectures([]);

      const requests = timetable.data.map((item) =>
        getLectureDetails(item.id, item.value, timetable.viewstate).then(
          (out) => {
            console.log(out);
            setLectures((prev) => [...prev, out]);
            setLoading(false);
            return out;
          },
        ),
      );

      const data = await Promise.all(requests);
      setLoading(false);
      return;

      setLectures(data);
    };
    run();
  }, [startDate]);

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
  lectures: LectureDetails[];
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
      hover: {
        cardProps: { openDelay: 300, closeDelay: 150 },
        contentProps: { className: "p-0 w-80" },
        content: <EventHoverContent lecture={lecture} />,
      },
    };
  });

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
                "flex-1 relative transition-[filter] basis-full max-w-full",
                loading && "blur transition-none",
              )}
            >
              <CalendarWeekView />
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
        {lecture.lecturers.length > 1 ? (
          <EventHoverProperty
            label={getLecturerName(lecture.classType, true)}
            value={lecture.lecturers.map(
              (lecturer) => `${lecturer.lastName} ${lecturer.firstName}`,
            )}
          />
        ) : (
          <EventHoverProperty
            label={getLecturerName(lecture.classType)}
            value={`${lecture.lecturers[0].lastName} ${lecture.lecturers[0].firstName}`}
          />
        )}
        <EventHoverProperty
          label={lecture.groups.length > 1 ? "Grupy" : "Grupa"}
          value={lecture.groups.join(", ")}
        />
        <EventHoverProperty
          label="Sala"
          value={`${lecture.building}/${lecture.room} ${
            lecture.roomDescription ? ` - ${lecture.roomDescription}` : ""
          }`}
        />
        <EventHoverProperty
          label="Czas trwania"
          value={`${lecture.duration} min`}
        />
        <EventHoverProperty
          label="Data"
          value={formatDate(lecture.startTime, "dd MMMM yyyy", {
            locale: pl,
          })}
        />
        <EventHoverProperty
          label="Czas rozp."
          value={formatDate(lecture.startTime, "HH:mm", { locale: pl })}
        />
        <EventHoverProperty
          label="Czas zak."
          value={formatDate(lecture.endTime, "HH:mm", { locale: pl })}
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
  value: string | string[] | number | number[];
}) {
  return (
    <>
      <p className="font-medium text-right">{label}</p>
      {typeof value === "string" || typeof value === "number" ? (
        <p>{value}</p>
      ) : (
        <div className="flex flex-col pt-0.5">
          {value.map((line) => (
            <p key={line} className="leading-5">
              {line}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
