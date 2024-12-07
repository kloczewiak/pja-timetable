"use client";
import {
  ReactiveCookiesProvider,
  useReactiveCookie,
} from "@/components/providers/cookies";
import {
  useViewstate,
  ViewStateProvider,
} from "@/components/providers/viewstate";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Group, GroupCookie } from "@/lib/types";
import { groupBy } from "@/lib/utils";
import { interleave } from "@/lib/utilsReact";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { useMediaQuery } from "usehooks-ts";
import { getSemesters, getStudentGroups, getStudies } from "./lib/data";

export default function Page() {
  const [viewstate, setViewstate] = useState<string>();

  const [semesters, setSemesters] = useState<string[]>();
  const [selectedSemester, setSelectedSemester] = useState<string>();

  const [studies, setStudies] = useState<string[]>();
  const [selectedStudy, setSelectedStudy] = useState<string>();

  useEffect(() => {
    getSemesters().then((sem) => {
      setViewstate(sem.viewstate);
      setSemesters(sem.data);
    });
  }, []);

  useEffect(() => {
    if (!selectedSemester || !semesters || !viewstate) return;

    getStudies(viewstate, selectedSemester).then((stud) => {
      setViewstate(stud.viewstate);
      setStudies(stud.data);
    });
  }, [selectedSemester]);

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-5">
      <ReactiveCookiesProvider>
        <SavedGroups />
        <SemesterPopover
          value={selectedSemester}
          setValue={setSelectedSemester}
          semesters={semesters}
        />
        <StudyPopover
          value={selectedStudy}
          setValue={setSelectedStudy}
          studies={studies}
        />
        {selectedStudy && selectedSemester && viewstate && (
          <ViewStateProvider viewstate={viewstate} setViewstate={setViewstate}>
            <StudentGroups semester={selectedSemester} study={selectedStudy} />
          </ViewStateProvider>
        )}
      </ReactiveCookiesProvider>
    </div>
  );
}

function SemesterPopover({
  semesters,
  value,
  setValue,
}: {
  semesters?: string[];
  value?: string;
  setValue: (value: string | undefined) => any;
}) {
  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger className="w-48" disabled={!semesters}>
        <SelectValue
          placeholder={!semesters ? "Ładowanie..." : "Wybierz semestr..."}
        />
      </SelectTrigger>
      {semesters && (
        <SelectContent>
          {semesters.map((semester) => (
            <SelectItem key={semester} value={semester}>
              {semester}
            </SelectItem>
          ))}
        </SelectContent>
      )}
    </Select>
  );
}

function StudyPopover({
  studies,
  value,
  setValue,
}: {
  studies?: string[];
  value?: string;
  setValue: Dispatch<SetStateAction<string | undefined>>;
}) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 640px)");

  const button = (
    <Button
      className="flex w-80 justify-between"
      variant="outline"
      role="combobox"
      aria-expanded={open}
    >
      <div className="shrink overflow-hidden truncate">
        {!studies ? "Ładowanie..." : (value ?? "Wybierz studia...")}
      </div>
      <ChevronDown className="opacity-50" />
    </Button>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={!studies}>
          {button}
        </PopoverTrigger>
        {studies && (
          <PopoverContent className="p-0">
            <StudyList
              studies={studies}
              value={value}
              setValue={setValue}
              close={() => setOpen(false)}
            />
          </PopoverContent>
        )}
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild disabled={!studies}>
        {button}
      </DrawerTrigger>
      {studies && (
        <DrawerContent>
          <VisuallyHidden>
            <DrawerTitle>Wybierz studia</DrawerTitle>
          </VisuallyHidden>
          <StudyList
            studies={studies}
            value={value}
            setValue={setValue}
            close={() => setOpen(false)}
          />
        </DrawerContent>
      )}
    </Drawer>
  );
}

function StudyList({
  studies,
  value,
  setValue,
  close,
}: {
  studies: string[];
  value?: string;
  setValue: Dispatch<SetStateAction<string | undefined>>;
  close: () => void;
}) {
  return (
    <Command>
      <CommandInput placeholder="Wyszukaj studia..." className="text-base" />
      <CommandList>
        <CommandEmpty>Brak wyników</CommandEmpty>
        <CommandGroup>
          {studies.map((study) => (
            <CommandItem
              key={study}
              value={study}
              onSelect={() => {
                setValue(() => study);
                close();
              }}
            >
              {value === study && <Check />}
              {study}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

type GroupsContextType = {
  groups: string[];
  setGroups: Dispatch<SetStateAction<string[]>>;
  toggleGroup: (group: string) => void;
};

const GroupsContext = createContext<GroupsContextType>({} as GroupsContextType);

function StudentGroups({
  semester,
  study,
}: {
  semester: string;
  study: string;
}) {
  const { viewstate } = useViewstate();

  const [loading, setLoading] = useState(true);
  const [cachedGroups, setCachedGroups] = useState<Record<string, string[]>>(
    {},
  );
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const currentGroups = cachedGroups[study];

  useEffect(() => {
    setSelectedGroups([]);

    if (!currentGroups) {
      setLoading(true);
      getStudentGroups(viewstate, study).then((sg) => {
        setCachedGroups((prev) => ({ ...prev, [study]: sg.data }));
        setLoading(false);
      });
    }
  }, [study]);

  if (!currentGroups || loading) {
    return <div>Loading...</div>;
  }

  const keyedGroups: Array<Group & { semester: string }> = currentGroups.map(
    (group) => {
      const semester = group.match(/^.+? [\w.]+/)?.toString() || "Group";
      const value = group.replace(semester, "").replace(" - ", "").trim();

      return {
        id: group,
        semester,
        value,
      };
    },
  );

  const groupedBySemester: Record<string, Group[]> = groupBy(
    keyedGroups,
    "semester",
  );

  return (
    <GroupsContext.Provider
      value={{
        groups: selectedGroups,
        setGroups: setSelectedGroups,
        toggleGroup: (group) => {
          if (selectedGroups.includes(group)) {
            setSelectedGroups((prev) => prev.filter((g) => g !== group));
          } else {
            setSelectedGroups((prev) => [...prev, group]);
          }
        },
      }}
    >
      <div className="w-full">
        <div className="mx-auto hidden w-full max-w-[1024px] grid-cols-2 gap-5 px-5 sm:grid">
          <div className="flex flex-col gap-5">
            {Object.entries(groupedBySemester)
              .filter((_, i) => i % 2 === 0)
              .map(([key, groups]) => (
                <SemesterGroup key={key} name={key} groups={groups} />
              ))}
          </div>
          <div className="flex flex-col gap-5">
            {Object.entries(groupedBySemester)
              .filter((_, i) => i % 2 === 1)
              .map(([key, groups]) => (
                <SemesterGroup key={key} name={key} groups={groups} />
              ))}
          </div>
        </div>
        <div className="flex w-full flex-col gap-5 px-5 sm:hidden">
          {Object.entries(groupedBySemester).map(([key, groups]) => (
            <SemesterGroup key={key} name={key} groups={groups} />
          ))}
        </div>
        <Controls semester={semester} study={study} />
      </div>
    </GroupsContext.Provider>
  );
}

function SavedGroups() {
  const [groups, setGroups] = useReactiveCookie<GroupCookie[]>("groups", []);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-screen-xl px-5">
      <h3 className="text-center text-xl font-medium">Zapisane Grupy</h3>
      <div className="grid grid-cols-[repeat(auto-fit,_minmax(0,_350px))] gap-5 justify-center mt-5">
        {groups.map((group) => (
          <Card key={JSON.stringify(group.groups)} className="flex flex-col">
            <CardHeader className="p-4">
              <CardTitle>{group.study}</CardTitle>
              <CardDescription>Semestr {group.semester}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 p-4 pt-0 grow items-start">
              {group.groups.map((g) => (
                <Badge
                  key={g}
                  variant="secondary"
                  className="pointer-events-none text-nowrap"
                >
                  {g}
                </Badge>
              ))}
            </CardContent>
            <CardFooter className="flex flex-wrap justify-end p-4 pt-0 gap-4">
              <Link
                href={{
                  pathname: "/timetable",
                  query: {
                    semester: group.semester,
                    study: group.study,
                    groups: group.groups,
                  },
                }}
                className={buttonVariants({ variant: "default" })}
              >
                Zobacz Plan
              </Link>
              <Button
                variant="destructive"
                onClick={() => {
                  const newGroups = groups.filter((g) => !Object.is(g, group));
                  setGroups(newGroups);
                }}
              >
                Usuń
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Controls({ semester, study }: { semester: string; study: string }) {
  const { groups, toggleGroup } = useContext(GroupsContext);
  const [savedGroups, setSavedGroups] = useReactiveCookie<GroupCookie[]>(
    "groups",
    [],
  );
  return (
    <div className="sticky bottom-0 w-full mt-3 py-2 backdrop-blur-sm">
      <div className="mx-auto max-w-screen-lg px-5 flex flex-row-reverse flex-wrap-reverse items-end gap-2">
        <div className="flex basis-full justify-center gap-2 sm:basis-auto">
          <Button
            variant="secondary"
            disabled={groups.length === 0}
            onClick={() => {
              const newCookie: GroupCookie = {
                semester,
                study,
                groups,
              };

              // TODO: This is not a perfect approach,
              // it doesn't check if the groups are the same but in different order
              const isAlreadyInCookies = savedGroups.some(
                (g) => JSON.stringify(g) == JSON.stringify(newCookie),
              );

              if (isAlreadyInCookies) return;

              setSavedGroups([...savedGroups, newCookie]);
            }}
          >
            Zapisz Grupy
          </Button>
          <Link
            className={buttonVariants({ variant: "default" })}
            href={{
              pathname: "/timetable",
              query: {
                semester,
                study,
                groups,
              },
            }}
          >
            Zobacz Plan
          </Link>
        </div>
        {groups.map((group) => (
          <Badge
            key={group}
            variant="default"
            onClick={() => toggleGroup(group)}
          >
            {group}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function SemesterGroup({ name, groups }: { name: string; groups: Group[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
      </CardHeader>
      <CardContent>
        <AllGroupTypes groups={groups} />
      </CardContent>
    </Card>
  );
}

function AllGroupTypes({ groups }: { groups: Group[] }) {
  const withTypes: Array<Group & { type: string }> = groups.map((group) => {
    const type = group.value.replace(" ang", "").slice(-1);
    return { ...group, type };
  });

  const groupedByType: Record<string, Group[]> = groupBy(withTypes, "type");

  const order = ["w", "c", "l", "p"];
  const sorted = Object.entries(groupedByType).sort(([keyA], [keyB]) => {
    const indexA = order.indexOf(keyA);
    const indexB = order.indexOf(keyB);

    const fa = indexA === -1 ? 99 : indexA;
    const fb = indexB === -1 ? 99 : indexB;

    return fa - fb;
  });

  return (
    <>
      {interleave(
        sorted.map(([type, value]) => (
          <GroupType key={type} type={type} groups={value} />
        )),
        <Separator />,
      )}
    </>
  );
}

function GroupType({ type, groups }: { type: string; groups: Group[] }) {
  const { groups: selectedGroups, toggleGroup } = useContext(GroupsContext);
  var typeName = "Inne";
  switch (type) {
    case "l":
      typeName = "Lektoraty";
      break;
    case "w":
      typeName = "Wykłady";
      break;
    case "c":
      typeName = "Ćwiczenia";
      break;
    case "p":
      typeName = "Praktyki (??)";
      break;
    default:
      typeName = "Inne";
      console.warn("Unknown group type", type);
      break;
  }

  const optsJSON = groups.map((o) => JSON.stringify(o));
  const set = new Set(optsJSON);
  const noDuplicates: Group[] = [...set].map((o) => JSON.parse(o));

  return (
    <div className="border-t border-t-background py-3 first:border-none first:pt-0 last:pb-0">
      <p>{typeName}</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {noDuplicates.map((option) => (
          <Badge
            key={option.id}
            variant={
              selectedGroups.includes(option.id) ? "default" : "secondary"
            }
            className="cursor-pointer select-none px-2 py-1"
            onClick={() => toggleGroup(option.id)}
          >
            {option.value}
          </Badge>
        ))}
      </div>
    </div>
  );
}
