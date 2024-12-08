export function stringifyPayload(payload: Record<string, any>) {
  return Object.entries(payload)
    .map(([key, value]) => {
      return `${encodeURIComponent(key)}=${encodeURIComponent(
        typeof value === "object" ? JSON.stringify(value) : value,
      )}`;
    })
    .join("&");
}

export const studiesPayload = (viewstate: string, semester: string) => ({
  ctl00$RadScriptManager1:
    "ctl00$ContentPlaceHolder1$ctl00$ContentPlaceHolder1$RadAjaxPanel1Panel|ctl00$ContentPlaceHolder1$SemestrComboBox",
  __VIEWSTATE: viewstate,
  ctl00_ContentPlaceHolder1_SemestrComboBox_ClientState: {
    text: semester,
  },
  __ASYNCPOST: true,
  RadAJAXControlID: "ctl00_ContentPlaceHolder1_RadAjaxPanel1",
});

export const studentGroupsPayload = (
  viewstate: string,
  studiesText: string,
) => ({
  ctl00$RadScriptManager1:
    "ctl00$ContentPlaceHolder1$ctl00$ContentPlaceHolder1$RadAjaxPanel1Panel|ctl00$ContentPlaceHolder1$StudiaComboBox",
  ctl00_ContentPlaceHolder1_StudiaComboBox_ClientState: {
    text: studiesText,
  },
  __ASYNCPOST: true,
  RadAJAXControlID: "ctl00_ContentPlaceHolder1_RadAjaxPanel1",
  __VIEWSTATE: viewstate,
});

export const lectureDetailsPayload = (
  lectureId: string,
  value: string,
  viewstate: string,
) => ({
  ctl00$RadScriptManager1:
    "ctl00$ContentPlaceHolder1$RadToolTipManager1RTMPanel|ctl00$ContentPlaceHolder1$RadToolTipManager1RTMPanel",
  ctl00_ContentPlaceHolder1_RadToolTipManager1_ClientState: {
    AjaxTargetControl: lectureId,
    Value: value,
  },
  __ASYNCPOST: true,
  __VIEWSTATE: viewstate,
});

export const timetableWithDatePayload = (
  viewstate: string,
  groupIDs: number[],
  dayInWeek?: { year: number; month: number; day: number },
) => {
  if (!dayInWeek) {
    const date = new Date();
    date.setHours(date.getHours() + 1);

    dayInWeek = {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  }

  return {
    ctl00$RadScriptManager1:
      "ctl00$ContentPlaceHolder1$ctl00$ContentPlaceHolder1$RadAjaxPanel1Panel|ctl00$ContentPlaceHolder1$PlanZajecRadScheduler$SelectedDateCalendar",
    ctl00_ContentPlaceHolder1_GrupyListBox_ClientState: {
      selectedIndices: groupIDs,
    },
    ctl00_ContentPlaceHolder1_PlanZajecRadScheduler_SelectedDateCalendar_SD: [
      [dayInWeek.year, dayInWeek.month, dayInWeek.day],
    ],
    __EVENTTARGET:
      "ctl00$ContentPlaceHolder1$PlanZajecRadScheduler$SelectedDateCalendar",
    __EVENTARGUMENT: "d",
    __VIEWSTATE: viewstate,
    // __VIEWSTATEGENERATOR: "D4F23601",
    // __EVENTVALIDATION:
    //   "/wEdAAMMRnPUyknYZGBdy/NtYj0fA7Ei4tJ3PSRs8inmRw+IZBpaNeayNa76rejb7B7RVXbor2HVgb3N+rGNxmGnsAM2Uw3kZ+FhtjUVsvUnP9qFCQ==",
    __ASYNCPOST: true,
    // RadAJAXControlID: "ctl00_ContentPlaceHolder1_RadAjaxPanel1",
  };
};
