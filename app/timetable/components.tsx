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
import { parse as parseDate, startOfWeek } from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
      id:
        lecture.subjectCode +
        lecture.startTime.hour +
        lecture.startTime.minute +
        lecture.classDate,
      start: parseDate(
        `${lecture.classDate} ${lecture.startTime.hour}:${lecture.startTime.minute}`,
        "d.M.yyyy H:m",
        new Date(),
      ),
      end: parseDate(
        `${lecture.classDate} ${lecture.endTime.hour}:${lecture.endTime.minute}`,
        "d.M.yyyy H:m",
        new Date(),
      ),
      title: `${lecture.subjectCode} - ${lecture.classType}\n${lecture.room}`,
      color: color,
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
          <div className="flex h-dvh flex-col p-4 pt-0">
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
              <span className="flex-1" />

              <CalendarCurrentDate />

              <CalendarPrevTrigger>
                <ChevronLeft size={20} />
                <span className="sr-only">Previous</span>
              </CalendarPrevTrigger>

              <CalendarTodayTrigger>Today</CalendarTodayTrigger>

              <CalendarNextTrigger>
                <ChevronRight size={20} />
                <span className="sr-only">Next</span>
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