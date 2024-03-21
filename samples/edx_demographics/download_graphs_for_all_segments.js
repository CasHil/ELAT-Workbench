async function automateDownloadSequence(segmentNames) {
  const selectCycleType = () => {
    const cycleTypeSelect = document.getElementById("cycleType");
    cycleTypeSelect.value = "downloadable";
    const event = new Event("change", { bubbles: true, cancelable: true });
    cycleTypeSelect.dispatchEvent(event);
  };

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
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  const downloadSVG = async () => {
    if (!hasSVG()) {
      console.log(
        "No SVG with the specified structure found, stopping download for this segment.",
      );
      return false;
    }
    document
      .querySelector('.btn.btn-sm.dropdown-toggle[data-toggle="dropdown"]')
      .click();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    document.querySelector("a#png_cycleChart").click();
    return true;
  };

  const hasSVG = () => {
    const svgs = document.querySelectorAll("#cycleChart svg");
    for (const svg of svgs) {
      const gElements = svg.querySelectorAll("g");
      for (const g of gElements) {
        const defs = g.querySelector("defs");
        if (defs && defs.innerHTML.trim().length > 0) {
          return true;
        }
      }
    }
    return false;
  };

  selectCycleType();

  for (const segmentName of segmentNames) {
    console.log(`Starting downloads for ${segmentName}`);
    clickButtonByClassAndText("button.btn-primary", segmentName);
    let week = 1;
    while (true) {
      await setWeek(week);
      const downloadResult = await downloadSVG();
      if (!downloadResult) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
      week++;
    }
  }
}

automateDownloadSequence(["All Segments", "Segment A", "Segment B"]);
