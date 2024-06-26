// import puppeteer from 'puppeteer';
const puppeteer = require("puppeteer");

function PromiseTimeout(delay) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, delay);
  });
}

(async () => {
  let args = [];
  args.push("--no-sandbox");
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 300,
    // executablePath: "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    dumpio: true,
    ignoreDefaultArgs: ["--disable-extensions"],
    args,
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98",
  );
  const width = 1035;
  const height = 1704;
  await page.setViewport({ width, height });

  await page.goto("https://mvallet91.github.io/hidden_workbench/");
  // await page.goto('http://localhost:63342/untitled/index.html?_ijt=b8cqq9hf4p5hoj7gah42l1ifem');

  page.on("error", (err) => {
    console.log("error happen at the page: ", err);
  });
  page.on("pageerror", (pageerr) => {
    console.log("pageerror occurred: ", pageerr);
  });

  await PromiseTimeout(6000);
  const title = await page.title();
  console.log(title);
  await page.screenshot({ path: "start.png" });

  let selector = "#buttons > button:nth-child(1)";
  await page.evaluate(
    (selector) => document.querySelector(selector).click(),
    selector,
  );

  let filePath = "C:/Users/manuelvalletor/ELAT-Metadata/FP101x-3T2015/";
  let fileNames = [
    "DelftX-FP101x-3T2015-course_structure-prod-analytics.json",
    "DelftX-FP101x-3T2015-prod.mongo",
    "DelftX-FP101x-3T2015-auth_user-prod-analytics.sql",
    "DelftX-FP101x-3T2015-auth_userprofile-prod-analytics.sql",
    "DelftX-FP101x-3T2015-student_courseenrollment-prod-analytics.sql",
    "DelftX-FP101x-3T2015-certificates_generatedcertificate-prod-analytics.sql",
  ];
  let filePaths = [];
  for (let file of fileNames) {
    filePaths.push(filePath + file);
  }
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    page.click("#filesInput"),
  ]);
  await fileChooser.accept(filePaths);
  await PromiseTimeout(60000);
  await page.screenshot({ path: "uploadedMeta.png" });

  await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
  await PromiseTimeout(20000);
  await page.screenshot({ path: "processedMeta.png" });

  await page.evaluate(
    (selector) => document.querySelector(selector).click(),
    selector,
  );

  let logPath = "C:/Users/manuelvalletor/surfdrive/Shared/WIS-EdX/logs/";
  let logPaths = [];
  for (let day = 15; day < 18; day++) {
    let logName = "delftx-edx-events-2015-10-" + day + ".log.gz";
    logPaths.push(logPath + logName);
  }
  console.log(logPaths);

  const [logfileChooser] = await Promise.all([
    page.waitForFileChooser(),
    page.click("#logFilesInput"),
  ]);
  await logfileChooser.accept(logPaths);
  await PromiseTimeout(300000);
  await page.screenshot({ path: "uploadedLogs.png" });

  await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
  await PromiseTimeout(300000);
  await page.screenshot({ path: "processedCharts.png", fullPage: true });

  const data = await page.$$eval("table tr td", (tds) =>
    tds.map((td) => {
      return td.innerHTML;
    }),
  );
  console.log(data);

  let verification = [
    "Introduction to Functional Programming",
    "Thu, October 15, 2015",
    "Tue, January 5, 2016",
    "20,559",
    "19",
    "39",
    "Introduction to Functional Programming",
    "30,077",
    "5,538",
    "4,064",
    "27,544",
    "7,801",
    "7,801",
    "2,547",
    "0.06",
    "79.50",
    "Verified: 281<br>Honor: 862<br>Audit: 0<br>",
    "Verified: 81.7<br>Honor: 78.8<br>Audit: undefined<br>",
    "19.16 minutes",
    "3,583",
  ];

  try {
    await page.evaluate(() => {
      throw new Error("js throw some error");
    });
  } catch (e) {
    console.log("an exception on page.evaluate ", e);
  }
  await browser.close();
})();
