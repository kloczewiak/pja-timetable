"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  HoverCardContentProps,
  HoverCardProps,
  HoverCardTriggerProps,
} from "@radix-ui/react-hover-card";
import {
  PopoverContentProps,
  PopoverProps,
  PopoverTriggerProps,
} from "@radix-ui/react-popover";
import { VariantProps, cva } from "class-variance-authority";
import {
  Locale,
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInMinutes,
  format,
  isSameHour,
  isToday,
  setHours,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import {
  ReactNode,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useMediaQuery } from "usehooks-ts";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const monthEventVariants = cva("size-2 rounded-full", {
  variants: {
    variant: {
      default: "bg-primary",
      blue: "bg-blue-500",
      green: "bg-green-500",
      pink: "bg-pink-500",
      purple: "bg-purple-500",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const dayEventVariants = cva("font-bold border-l-4 rounded p-2 text-xs", {
  variants: {
    variant: {
      default: "bg-muted/30 text-muted-foreground border-muted",
      blue: "bg-blue-500/30 text-blue-600 border-blue-500",
      green: "bg-green-500/30 text-green-600 border-green-500",
      pink: "bg-pink-500/30 text-pink-600 border-pink-500",
      purple: "bg-purple-500/30 text-purple-600 border-purple-500",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type View = "day" | "week" | "month" | "year";

type ContextType = {
  view: View;
  setView: (view: View) => void;
  date: Date;
  setDate: (date: Date) => void;
  events: CalendarEvent[];
  locale: Locale;
  onChangeView?: (view: View) => void;
  onEventClick?: (event: CalendarEvent) => void;
  enableHotkeys?: boolean;
  today: Date;
  hourDisplay: {
    count: number;
    start: number;
  };
};

const Context = createContext<ContextType>({} as ContextType);

export type CalendarEvent = {
  id: string;
  start: Date;
  end: Date;
  title: string;
  color?: VariantProps<typeof monthEventVariants>["variant"];
  hover?: {
    cardProps?: HoverCardProps;
    contentProps?: HoverCardContentProps;
    content: ReactNode;
  };
};

type CalendarProps = {
  children: ReactNode;
  events: CalendarEvent[];
  view?: View;
  locale?: Locale;
  enableHotkeys?: boolean;
  onChangeView?: (view: View) => void;
  onEventClick?: (event: CalendarEvent) => void;
  date?: Date;
  onDateChange?: (date: Date) => void;
  hourDisplay?: {
    count: number;
    start: number;
  };
};

const Calendar = ({
  children,
  locale = enUS,
  enableHotkeys = true,
  view: _defaultMode,
  onEventClick,
  events,
  onChangeView,
  date: defaultDate,
  onDateChange,
  hourDisplay = {
    count: 24,
    start: 0,
  },
}: CalendarProps) => {
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState<Date>(new Date(1732618800));

  const isControlled = defaultDate !== undefined;

  const displayedDate = isControlled ? defaultDate : date;

  const changeEvent = (d: Date) => {
    if (onDateChange) {
      onDateChange(d);
    }
    if (!isControlled) {
      setDate(d);
    }
  };

  const controlledView = _defaultMode || view;

  const changeView = (view: View) => {
    setView(view);
    onChangeView?.(view);
  };

  useHotkeys("m", () => changeView("month"), {
    enabled: enableHotkeys,
  });

  useHotkeys("w", () => changeView("week"), {
    enabled: enableHotkeys,
  });

  useHotkeys("y", () => changeView("year"), {
    enabled: enableHotkeys,
  });

  useHotkeys("d", () => changeView("day"), {
    enabled: enableHotkeys,
  });

  return (
    <Context.Provider
      value={{
        view: controlledView,
        setView,
        date: displayedDate,
        setDate: changeEvent,
        events,
        locale,
        enableHotkeys,
        onEventClick,
        onChangeView,
        today: new Date(),
        hourDisplay: hourDisplay,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export const useCalendar = () => useContext(Context);

const CalendarViewTrigger = forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement> & {
    view: View;
  }
>(({ children, view, ...props }, ref) => {
  const { view: currentView, setView, onChangeView } = useCalendar();

  return (
    <Button
      ref={ref}
      aria-current={currentView === view}
      size="sm"
      variant="ghost"
      {...props}
      onClick={() => {
        setView(view);
        onChangeView?.(view);
      }}
    >
      {children}
    </Button>
  );
});
CalendarViewTrigger.displayName = "CalendarViewTrigger";

const EventGroup = ({
  events,
  hour,
}: {
  events: CalendarEvent[];
  hour: Date;
}) => {
  return (
    <div className="relative border-t last:border-b">
      {events
        .filter((event) => isSameHour(event.start, hour))
        .map((event) => {
          const hoursDifference =
            differenceInMinutes(event.end, event.start) / 60;
          const startPosition = event.start.getMinutes() / 60;

          return (
            <div
              key={event.id}
              className="absolute overflow-hidden inset-x-0 z-10"
              style={{
                top: `${startPosition * 100}%`,
                height: `calc(${hoursDifference * 100}% + 1px)`,
              }}
            >
              <HybridTooltip {...event.hover?.cardProps}>
                <HybridTooltipTrigger className="w-full h-full justify-start items-start">
                  <div
                    className={cn(
                      "h-full",
                      dayEventVariants({ variant: event.color }),
                      hoursDifference < 1 && "flex flex-row gap-2",
                    )}
                  >
                    {event.title.split("\n").map((line) => (
                      <div key={line} className="text-nowrap">
                        {line}
                      </div>
                    ))}
                  </div>
                </HybridTooltipTrigger>
                {event.hover ? (
                  <HybridTooltipContent {...event.hover.contentProps}>
                    {event.hover.content}
                  </HybridTooltipContent>
                ) : (
                  <HybridTooltipContent>
                    <p>Ładowanie...</p>
                  </HybridTooltipContent>
                )}
              </HybridTooltip>
            </div>
          );
        })}
    </div>
  );
};

const isTouchDevice = () => {
  const isCoarse = useMediaQuery("(pointer: coarse)");
  return !isCoarse;
};

const HybridTooltip = (props: HoverCardProps & PopoverProps) => {
  const isTouch = isTouchDevice();

  if (isTouch) {
    return <HoverCard {...props} />;
  } else {
    return <Popover {...props} />;
  }
};

const HybridTooltipTrigger = ({
  children,
  ...props
}: HoverCardTriggerProps & PopoverTriggerProps) => {
  const isTouch = isTouchDevice();

  if (isTouch) {
    return <HoverCardTrigger {...props} children={children} />;
  } else {
    return (
      <PopoverTrigger {...props} asChild>
        <div>{children}</div>
      </PopoverTrigger>
    );
  }
};

const HybridTooltipContent = (
  props: HoverCardContentProps & PopoverContentProps,
) => {
  const isTouch = isTouchDevice();

  if (isTouch) {
    return <HoverCardContent {...props} />;
  } else {
    return <PopoverContent {...props} />;
  }
};

const CalendarDayView = () => {
  const { view, events, date, hourDisplay } = useCalendar();

  if (view !== "day") return null;

  const hours = [...Array(hourDisplay.count)].map((_, i) =>
    setHours(date, i + hourDisplay.start),
  );

  return (
    <div className="relative flex h-full overflow-y-visible overflow-x-clip py-2">
      <TimeTable />
      <div
        className="grid flex-1 grid-cols-1"
        style={{ gridTemplateRows: `repeat(${hourDisplay.count}, 1fr)` }}
      >
        {hours.map((hour) => (
          <EventGroup key={hour.toString()} hour={hour} events={events} />
        ))}
      </div>
    </div>
  );
};

const CalendarWeekView = ({
  startOnDay = 0,
  endOnDay = 6,
}: {
  startOnDay?: number;
  endOnDay?: number;
}) => {
  const { view, date, locale, events, hourDisplay } = useCalendar();

  const weekDates = useMemo(() => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const weekDates = [];

    for (let i = startOnDay; i <= endOnDay; i++) {
      const day = addDays(start, i);
      const hours = [...Array(hourDisplay.count)].map((_, i) =>
        setHours(day, i + hourDisplay.start),
      );
      weekDates.push(hours);
    }

    return weekDates;
  }, [date, startOnDay, endOnDay]);

  const headerDays = useMemo(() => {
    const daysOfWeek = [];
    for (let i = startOnDay; i <= endOnDay; i++) {
      const result = addDays(startOfWeek(date, { weekStartsOn: 1 }), i);
      daysOfWeek.push(result);
    }
    return daysOfWeek;
  }, [date, startOnDay, endOnDay]);

  if (view !== "week") return null;

  return (
    <div className="relative flex h-full flex-col overflow-x-clip overflow-y-visible">
      <div className="sticky top-0 z-10 mb-3 flex border-b bg-card">
        <div className="w-12"></div>
        {headerDays.map((date, i) => (
          <div
            key={date.toString()}
            className={cn(
              "text-center flex-1 gap-1 pb-2 text-sm text-muted-foreground flex items-center justify-center",
              [5, 6].includes(i) && "text-muted-foreground/50",
            )}
          >
            {format(date, "E", { locale })}
            <span
              className={cn(
                "h-6 grid place-content-center",
                isToday(date) &&
                  "bg-primary text-primary-foreground rounded-full size-6",
              )}
            >
              {format(date, "d")}
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-1">
        <div className="w-fit">
          <TimeTable />
        </div>
        <div
          className="grid flex-1"
          style={{
            gridTemplateColumns: `repeat(${endOnDay - startOnDay + 1}, minmax(0, 1fr))`,
          }}
        >
          {weekDates.map((hours, i) => {
            return (
              <div
                className={cn(
                  "h-full text-sm text-muted-foreground border-l first:border-l-0 grid grid-cols-1",
                  [5, 6].includes(i) && "bg-muted/50",
                )}
                key={hours[0].toString()}
                style={{
                  gridTemplateRows: `repeat(${hourDisplay.count}, 1fr)`,
                }}
              >
                {hours.map((hour) => (
                  <EventGroup
                    key={hour.toString()}
                    hour={hour}
                    events={events}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CalendarNextTrigger = forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement>
>(({ children, onClick, ...props }, ref) => {
  const { date, setDate, view, enableHotkeys } = useCalendar();

  const next = useCallback(() => {
    if (view === "day") {
      setDate(addDays(date, 1));
    } else if (view === "week") {
      setDate(addWeeks(date, 1));
    } else if (view === "month") {
      setDate(addMonths(date, 1));
    } else if (view === "year") {
      setDate(addYears(date, 1));
    }
  }, [date, view, setDate]);

  useHotkeys("ArrowRight", () => next(), {
    enabled: enableHotkeys,
  });

  return (
    <Button
      size="icon"
      variant="outline"
      ref={ref}
      {...props}
      onClick={(e) => {
        next();
        onClick?.(e);
      }}
    >
      {children}
    </Button>
  );
});
CalendarNextTrigger.displayName = "CalendarNextTrigger";

const CalendarPrevTrigger = forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement>
>(({ children, onClick, ...props }, ref) => {
  const { date, setDate, view, enableHotkeys } = useCalendar();

  useHotkeys("ArrowLeft", () => prev(), {
    enabled: enableHotkeys,
  });

  const prev = useCallback(() => {
    if (view === "day") {
      setDate(subDays(date, 1));
    } else if (view === "week") {
      setDate(subWeeks(date, 1));
    } else if (view === "month") {
      setDate(subMonths(date, 1));
    } else if (view === "year") {
      setDate(subYears(date, 1));
    }
  }, [date, view, setDate]);

  return (
    <Button
      size="icon"
      variant="outline"
      ref={ref}
      {...props}
      onClick={(e) => {
        prev();
        onClick?.(e);
      }}
    >
      {children}
    </Button>
  );
});
CalendarPrevTrigger.displayName = "CalendarPrevTrigger";

const CalendarTodayTrigger = forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement>
>(({ children, onClick, ...props }, ref) => {
  const { setDate, enableHotkeys, today } = useCalendar();

  useHotkeys("t", () => jumpToToday(), {
    enabled: enableHotkeys,
  });

  const jumpToToday = useCallback(() => {
    setDate(today);
  }, [today, setDate]);

  return (
    <Button
      variant="outline"
      ref={ref}
      {...props}
      onClick={(e) => {
        jumpToToday();
        onClick?.(e);
      }}
    >
      {children}
    </Button>
  );
});
CalendarTodayTrigger.displayName = "CalendarTodayTrigger";

const CalendarCurrentDate = () => {
  const { date, view, locale } = useCalendar();

  return (
    <time dateTime={date.toISOString()} className="tabular-nums">
      {format(date, view === "day" ? "dd MMMM yyyy" : "LLLL yyyy", { locale })}
    </time>
  );
};

const TimeTable = () => {
  const { hourDisplay } = useCalendar();
  const [reload, setReload] = useState(false);
  const now = new Date();

  useEffect(() => {
    const seconds = now.getSeconds();
    const milis = now.getMilliseconds();

    const timeUntilNextMinute = (60 - seconds) * 1000 - milis;

    const timeout = setTimeout(() => {
      setReload((r) => !r);
    }, timeUntilNextMinute);

    return () => clearTimeout(timeout);
  }, [reload]);

  return (
    <div className="flex h-full w-10 flex-col pr-2">
      {Array.from(Array(hourDisplay.count + 1).keys()).map((hourb) => {
        const hour = hourb + hourDisplay.start;
        return (
          <div
            className="relative basis-full text-right text-xs text-muted-foreground/50 last:h-0 last:shrink-0 last:basis-0"
            key={hour}
          >
            {now.getHours() === hour && (
              <div
                className="absolute left-full z-20 ml-1 h-[2px] w-dvw translate-x-1 bg-red-500/50"
                style={{
                  top: `${(now.getMinutes() / 60) * 100}%`,
                }}
              >
                <div className="absolute left-0 top-1/2 z-20 size-2 -translate-x-full -translate-y-1/2 rounded-full bg-red-500/50"></div>
              </div>
            )}
            <p className="absolute right-0 top-0 z-50 -translate-y-1/2">
              {hour === 24 ? 0 : hour}:00
            </p>
          </div>
        );
      })}
    </div>
  );
};

export {
  Calendar,
  CalendarCurrentDate,
  CalendarDayView,
  CalendarNextTrigger,
  CalendarPrevTrigger,
  CalendarTodayTrigger,
  CalendarViewTrigger,
  CalendarWeekView,
};
