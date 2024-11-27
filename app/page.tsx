"use client";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  getSemesters,
  getStudentGroups,
  getStudies,
  WithViewstate,
} from "./lib/data";

export default function Page() {
  const [semesters, setSemesters] = useState<string[]>();
  const [studies, setStudies] = useState<string[]>();

  const [selectedSemester, setSelectedSemester] = useState<string>();
  const [selectedStudy, setSelectedStudy] = useState<string>();

  useEffect(() => {
    getSemesters().then((s) => {
      setSemesters(s);
      setSelectedSemester(s[0]);
    });
    getStudies().then((s) => {
      setStudies(s);
      setSelectedStudy(s[0]);
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-5">
      <Select value={selectedSemester} onValueChange={setSelectedSemester}>
        <SelectTrigger className="w-48" disabled={!semesters}>
          <SelectValue placeholder={!semesters ? "Ładowanie..." : ""} />
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
      <StudyPopover
        value={selectedStudy}
        setValue={setSelectedStudy}
        studies={studies}
      />
      {/* <pre className="max-w-full">{groups}</pre> */}
      {selectedStudy && <StudentGroups study={selectedStudy} />}
    </div>
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

function StudentGroups({ study }: { study: string }) {
  const [loading, setLoading] = useState(true);
  const [cachedGroups, setCachedGroups] = useState<
    Record<string, WithViewstate<string[]>>
  >({});
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const currentGroups = cachedGroups[study];

  useEffect(() => {
    setSelectedGroups([]);

    if (!currentGroups) {
      setLoading(true);
      getStudentGroups(study).then((sg) => {
        setCachedGroups((prev) => ({ ...prev, [study]: sg }));
        setLoading(false);
      });
    }
  }, [study]);

  if (!currentGroups || loading) {
    return <div>Loading...</div>;
  }

  const groups = currentGroups.data;

  const keyedGroups = groups.map((group) => {
    const key = group.match(/^.+? [\w.]+/)?.toString() || "Group";
    const value = group.replace(key, "").replace(" - ", "").trim();

    return {
      key,
      value,
      ogValue: group,
    };
  });

  const groupedBySemester = keyedGroups.reduce(
    (prev, curr) => {
      const index = prev.findIndex((p) => p.name === curr.key);
      if (index !== -1) {
        prev[index].options.push({ value: curr.value, ogValue: curr.ogValue });
      } else {
        prev.push({
          name: curr.key,
          options: [{ value: curr.value, ogValue: curr.ogValue }],
        });
      }

      return prev;
    },
    [] as { name: string; options: { value: string; ogValue: string }[] }[],
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
            {groupedBySemester
              .filter((_, i) => i % 2 === 0)
              .map((group) => (
                <SemesterGroup
                  key={group.name}
                  name={group.name}
                  options={group.options}
                />
              ))}
          </div>
          <div className="flex flex-col gap-5">
            {groupedBySemester
              .filter((_, i) => i % 2 === 1)
              .map((group) => (
                <SemesterGroup
                  key={group.name}
                  name={group.name}
                  options={group.options}
                />
              ))}
          </div>
        </div>
        <div className="flex w-full flex-col gap-5 px-5 sm:hidden">
          {groupedBySemester.map((group) => (
            <SemesterGroup
              key={group.name}
              name={group.name}
              options={group.options}
            />
          ))}
        </div>
        <Controls study={study} />
      </div>
    </GroupsContext.Provider>
  );
}

function Controls({ study }: { study: string }) {
  const { groups, toggleGroup } = useContext(GroupsContext);
  return (
    <div className="sticky bottom-0 w-full mt-3 py-2 backdrop-blur-sm">
      <div className="mx-auto max-w-screen-lg px-5 flex flex-row-reverse flex-wrap-reverse items-end gap-2">
        <div className="flex basis-full flex-col items-center sm:basis-auto">
          <Link
            className={buttonVariants({ variant: "default" })}
            href={{
              pathname: "/timetable",
              query: {
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

function SemesterGroup({
  name,
  options,
}: {
  name: string;
  options: { value: string; ogValue: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
      </CardHeader>
      <CardContent>
        <AllGroupTypes options={options} />
      </CardContent>
    </Card>
  );
}

function AllGroupTypes({
  options,
}: {
  options: { value: string; ogValue: string }[];
}) {
  const groupedByType = options.reduce(
    (prev, curr) => {
      const type = curr.value.replace(" ang", "").slice(-1);

      const index = prev.findIndex((p) => p.type === type);
      if (index !== -1) {
        prev[index].options.push({ value: curr.value, ogValue: curr.ogValue });
      } else {
        prev.push({
          type,
          options: [{ value: curr.value, ogValue: curr.ogValue }],
        });
      }

      return prev;
    },
    [] as { type: string; options: { value: string; ogValue: string }[] }[],
  );

  const order = ["w", "c", "l", "p"];
  const sorted = groupedByType.sort((a, b) => {
    const indexA = order.indexOf(a.type);
    const indexB = order.indexOf(b.type);

    const fa = indexA === -1 ? 99 : indexA;
    const fb = indexB === -1 ? 99 : indexB;

    return fa - fb;
  });

  return (
    <>
      {interleave(
        sorted.map((group) => (
          <GroupType
            key={group.type}
            type={group.type}
            options={group.options}
          />
        )),
        <Separator />,
      )}
    </>
  );
}

function GroupType({
  type,
  options,
}: {
  type: string;
  options: { value: string; ogValue: string }[];
}) {
  const { groups, toggleGroup } = useContext(GroupsContext);
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

  const optsJSON = options.map((o) => JSON.stringify(o));
  const set = new Set(optsJSON);
  const noDuplicates = [...set].map((o) => JSON.parse(o));

  return (
    <div className="border-t border-t-background py-3 first:border-none first:pt-0 last:pb-0">
      <p>{typeName}</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {noDuplicates.map((option) => (
          <Badge
            key={option.ogValue}
            variant={groups.includes(option.ogValue) ? "default" : "secondary"}
            className="cursor-pointer select-none px-2 py-1"
            onClick={() => toggleGroup(option.ogValue)}
          >
            {option.value}
          </Badge>
        ))}
      </div>
    </div>
  );
}
