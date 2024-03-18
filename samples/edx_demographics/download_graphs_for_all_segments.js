// This script automates the download of the cycle chart for all segments in the ELAT-Workbench course.

async function automateDownloadSequence(segmentNames) {
  const clickButtonByClassAndText = (className, textContent) => {
    const buttons = document.querySelectorAll(className);
    for (const button of buttons) {
      if (button.textContent.trim() === textContent) {
        button.click();
        break;
      }
    }
  };

  const setWeek = async (week) => {
    const cycleWeekInput = document.getElementById("cycleWeek");
    cycleWeekInput.value = week;
    const event = new Event("change", { bubbles: true, cancelable: true });
    cycleWeekInput.dispatchEvent(event);
    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  const downloadSVG = async () => {
    document
      .querySelector('.btn.btn-sm.dropdown-toggle[data-toggle="dropdown"]')
      .click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    document.querySelector("a#png_cycleChart").click();
  };

  const hasSVG = () => {
    return document.querySelector("#cycleChart svg") !== null;
  };

  for (const segmentName of segmentNames) {
    clickButtonByClassAndText("button.btn-primary", segmentName);
    let week = 1;
    while (true) {
      await setWeek(week);
      if (hasSVG()) {
        await downloadSVG();
        await new Promise((resolve) => setTimeout(resolve, 2000));
        week++;
      } else {
        break;
      }
    }
  }
}

automateDownloadSequence(["All Segments", "Segment A", "Segment B"]);
