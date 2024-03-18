/**
 * @fileOverview EdX Log file Analysis Tool
 * @author <a href="mailto:m.valletorre@tudelft.nl">Manuel Valle Torre</a>
 * @version 0.1
 */

import { processMetadataFiles } from "./metadataProcessing.js";
import {
  populateSamples,
  initiateEdxDb,
  clearWebdataForUpdate,
  deleteEverything,
  processTablesForDownload,
} from "./databaseHelpers.js";
import {
  loader,
  downloadForumSegmentation,
  progressDisplay,
  webdataJSON,
  verifyBrowser,
} from "./helpers.js";
import {
  processGeneralSessions,
  processForumSessions,
  processVideoInteractionSessions,
  processAssessmentsSubmissions,
  processQuizSessions,
  processORASessions,
} from "./logProcessing.js";
import { exportChartPNG } from "./graphHelpers.js";
import {
  drawCharts,
  updateCharts,
  updateChartsBySegment,
} from "./graphProcessing.js";
var connection = new JsStore.Instance();

window.onload = function () {
  //// PAGE INITIALIZATION  //////////////////////////////////////////////////////////////////////////////
  verifyBrowser();
  initiateEdxDb(connection);

  prepareDashboard();
  drawCharts(connection)
    .then(function () {
      console.log("Charts Ready");
    })
    .catch(function (error) {
      loader(false);
      console.log(error);
    });
  segmentationButtons(connection);

  //// MULTI-FILE INPUTS INITIALIZATION //////////////////////////////////////////////////////////////////
  let multiFileInputMetadata = document.getElementById("filesInput");
  multiFileInputMetadata.value = "";
  multiFileInputMetadata.addEventListener("change", async function () {
    loader(true);
    await readMetadataFiles(multiFileInputMetadata.files, processMetadataFiles);
  });

  let multiFileInputLogs = document.getElementById("logFilesInput");
  multiFileInputLogs.value = "";
  multiFileInputLogs.addEventListener("change", function () {
    loader(true);
    prepareLogFiles(0);
  });

  //// BUTTONS INITIALIZATION /////////////////////////////////////////////////////////////////////////////
  let buttons = document.querySelectorAll("button");
  buttons.forEach((btn) => {
    btn.addEventListener("click", buttonHandler);
  });

  // RADIO INPUT INITIALIZATION //////////////////////////////////////////////////////////////////////////////
  let inputs = document.querySelectorAll("input");
  inputs.forEach((input) => {
    input.addEventListener("change", inputHandler);
  });

  //  ANCHOR ELEMENTS INITIALIZATION ////////////////////////////////////////////////////////////////////////
  let anchors = document.querySelectorAll("a");
  anchors.forEach((a) => {
    a.addEventListener("click", anchorHandler);
  });
};

let reader = new FileReader();

// METADATA FILE PROCESSING /////////////////////////////////////////////////////////////////////////////////////////

/**
 * Initial processing of metadata files, creates an object with the file names as keys and contents as values,
 * to then execute the processing via callback
 * @param {FileList} files List of files uploaded by user to file input
 * @param {function} callback Function to process the prepared files
 */
async function readMetadataFiles(files, callback) {
  loader(true);
  let output = [],
    checkedFiles = {},
    processedFiles = [],
    fileNames = "Names: ",
    counter = 1;
  const sqlType = "sql",
    jsonType = "json",
    mongoType = "mongo";
  for (const f of files) {
    output.push(
      "<li><strong>",
      f.name,
      "</strong> (",
      f.type || "n/a",
      ") - ",
      f.size,
      " bytes",
      "</li>",
    );

    if (f.name.includes("zip")) {
      loader(false);
      toastr.error("Metadata files have to be unzipped!");
      break;
    }

    if (
      f.name.includes(sqlType) ||
      f.name.includes(jsonType) ||
      f.name.includes(mongoType)
    ) {
      let reader = new FileReader();
      reader.onloadend = async function () {
        let content = reader.result;
        checkedFiles[f.name] = reader.result;
        processedFiles.push({
          key: f.name,
          value: reader.result,
        });
        fileNames =
          fileNames + f.name + " size: " + content.length + " bytes \n";
        if (counter === files.length) {
          document.getElementById("list").innerHTML =
            "<ul>" + output.join("") + "</ul>";
          await processMetadataFiles(processedFiles, connection);
        }
        counter++;
        reader.abort();
      };
      reader.readAsText(f);
    } else {
      counter++;
    }
  }
}

// LOGFILE PROCESSING /////////////////////////////////////////////////////////////////////////////////////////

/**
 * Function to handle and read the ordered log files. It iterates through the files uploaded by the user into the input,
 * and if the file number, and chunk number match the current values to process, it will call the unzipAndChunkLogfile
 * function with the file. This function also finishes the process when the files are over.
 * @param {number} fileIndex Current file to process
 * @param {number} chunkIndex Current chunk to process
 * @param {number} totalChunks Total chunks to process in current file
 */
function prepareLogFiles(fileIndex) {
  const multiFileInputLogs = document.getElementById("logFilesInput"),
    files = multiFileInputLogs.files,
    totalFiles = files.length;

  if (fileIndex < totalFiles) {
    toastr.info("Starting with file number " + (fileIndex + 1));
    console.log(
      "File",
      fileIndex + 1,
      "out of",
      totalFiles,
      "-----------------------------",
    );
    let counter = 0;
    for (const f of files) {
      console.log("File", counter + 1, "out of", totalFiles);
      if (counter === fileIndex) {
        const today = new Date();
        console.log("Starting at", today);
        unzipAndChunkLogfile(
          f,
          reader,
          fileIndex,
          totalFiles,
          processUnzippedChunk,
        );
      }
      counter += 1;
    }
  } else {
    let table = document.getElementById("progress_tab"),
      row = table.insertRow(),
      cell1 = row.insertCell();
    setTimeout(function () {
      toastr.success("Please reload the page now", "LogFiles Processed!", {
        timeOut: 0,
      });
      cell1.innerHTML = "Done! at " + new Date().toLocaleString("en-GB");
      loader(false);
    }, 1000);
  }
}

let chunkSize = 30 * 1024 * 1024;

/**
 * This function is always called by the prepareLogFiles function, and it will inflate the gzipped file between
 * the byte number indicated by the chunkIndex and the chunkSize, then decode the byteArray with a TextDecoder,
 * and find the actual line to start the JSON object, and the end of the final line.
 * @param {File} file File object for the current file to process
 * @param {FileReader} reader FileReader instance
 * @param {number} fileIndex Current file to process
 * @param {number} totalFiles Total number of files to process
 * @param {number} chunkIndex Current chunk to process
 * @param {number} totalChunks Total chunks to process in current file
 * @param {function} callback Function to process the records of the unzipped chunk
 */
function unzipAndChunkLogfile(file, reader, fileIndex, totalFiles, callback) {
  let output = [];
  let gzipType = /gzip/;
  output.push(
    "<li><strong>",
    file.name,
    "</strong> (",
    file.type || "n/a",
    ") - ",
    file.size,
    " bytes",
    "</li>",
  );
  if (!file.type.match(gzipType)) {
    loader(false);
    toastr.error(file.name + " is not a log file (should end with: .log.gz)");
  } else {
    reader.onload = function (event) {
      try {
        console.log("Starting chunks", new Date());
        const buffer = new Uint8Array(event.target.result);
        let chunkIndex = 1,
          totalChunks = Math.ceil(buffer.length / chunkSize);

        const stream = new fflate.AsyncDecompress((err, dat) => {
          const stringContent = fflate.strFromU8(dat);
          let processedFiles = [];
          processedFiles.push({
            key: file.name,
            value: stringContent.slice(
              stringContent.indexOf('{"username":'),
              stringContent.lastIndexOf("\n{"),
            ),
          });
          if (stringContent.split("\n").length > 10) {
            callback(
              processedFiles,
              fileIndex,
              totalFiles,
              chunkIndex,
              totalChunks,
            );
            chunkIndex++;
          }
        });
        let i = 0;
        for (; i < buffer.length - chunkSize; i += chunkSize) {
          console.log("Chunk", chunkIndex, "out of", totalChunks);
          stream.push(buffer.slice(i, i + chunkSize));
        }
        stream.push(buffer.slice(i), true);
      } catch (error) {
        if (error instanceof RangeError) {
          console.log(error);
          loader(false);
        } else {
          console.error(error);
          toastr.error(
            "There was an error unzipping the file, please try again",
          );
          toastr.info(
            "If this happens again, restart Chrome and close all other tabs",
          );
          loader(false);
        }
      }
    };
    reader.readAsArrayBuffer(file);
  }
}

/**
 * This will first get the Metadata map from the database, and then process the current chunk for all the types of log
 * activities that ELAT can currently handle.
 * @param {array} processedFiles Array with file objects of name and content, currently only with the unzipped chunk
 * @param {number} fileIndex Current file to process
 * @param {number} totalFiles Total number of files to process
 * @param {number} chunkIndex Current chunk to process
 * @param {number} totalChunks Total chunks to process in current file
 */
function processUnzippedChunk(
  processedFiles,
  fileIndex,
  totalFiles,
  chunkIndex,
  totalChunks,
) {
  connection
    .runSql("SELECT * FROM metadata WHERE name = 'metadata_map' ")
    .then(function (result) {
      if (result.length === 0) {
        loader(false);
        toastr.error(
          "Metadata has not been processed! Please upload all metadata files first",
        );
      } else {
        let courseMetadataMap = result[0]["object"];
        let table = document.getElementById("progress_tab"),
          row = table.insertRow(),
          cell1 = row.insertCell();
        cell1.innerHTML =
          "Processing file " +
          (fileIndex + 1) +
          "/" +
          totalFiles +
          "\n at " +
          new Date().toLocaleString("en-GB");

        // for (let f of processedFiles) {
        //     console.log(f.key);
        //     let lines = f.value.split('\n');
        //     console.log('Lines in file:', lines.length);
        //     if (chunkIndex === totalChunks) {
        //         fileIndex++;
        //         prepareLogFiles(fileIndex);
        //     }
        // }

        processGeneralSessions(
          courseMetadataMap,
          processedFiles,
          fileIndex,
          totalFiles,
          chunkIndex,
          connection,
        );
        processForumSessions(
          courseMetadataMap,
          processedFiles,
          fileIndex,
          totalFiles,
          chunkIndex,
          connection,
        );
        processVideoInteractionSessions(
          courseMetadataMap,
          processedFiles,
          fileIndex,
          totalFiles,
          chunkIndex,
          connection,
        );
        processAssessmentsSubmissions(
          courseMetadataMap,
          processedFiles,
          fileIndex,
          totalFiles,
          chunkIndex,
          connection,
        );
        processQuizSessions(
          courseMetadataMap,
          processedFiles,
          fileIndex,
          totalFiles,
          chunkIndex,
          connection,
        );
        processORASessions(
          courseMetadataMap,
          processedFiles,
          fileIndex,
          totalFiles,
          chunkIndex,
          totalChunks,
          connection,
          prepareLogFiles,
        );
      }
    });
}

// DASHBOARD PROCESSING //////////////////////////////////////////////////////////////////////////////////////
/**
 * Initializes the gridster object that contains the interactive dashboard with default order, or it saves and
 * initializes the custom order edited by the user.
 */
function prepareDashboard() {
  $(function () {
    let localData = JSON.parse(localStorage.getItem("positions"));
    if (localData != null) {
      console.log("Loading dashboard position");
      $.each(localData, function (i, value) {
        let id_name = "#";
        id_name = id_name + value.id;
        $(id_name).attr({
          "data-col": value.col,
          "data-row": value.row,
          "data-sizex": value.size_x,
          "data-sizey": value.size_y,
        });
      });
    } else {
      let defaultOrder = [];
      if (window.innerWidth > 1400) {
        defaultOrder = [
          { id: "cycleTile", col: 1, row: 20, size_x: 12, size_y: 6 },
        ];
      } else {
        defaultOrder = [
          { id: "cycleTile", col: 1, row: 29, size_x: 12, size_y: 5 },
        ];
      }
      $.each(defaultOrder, function (i, value) {
        let id_name = "#";
        id_name = id_name + value.id;
        $(id_name).attr({
          "data-col": value.col,
          "data-row": value.row,
          "data-sizex": value.size_x,
          "data-sizey": value.size_y,
        });
      });
      console.log("Dashboard is in default state");
    }

    let gridster;
    $(function () {
      gridster = $(".gridster ul")
        .gridster({
          widget_base_dimensions: [1200, 200],
          widget_margins: [5, 5],
          helper: "clone",
          resize: {
            enabled: true,
            stop: function (event, ui) {
              let positions = JSON.stringify(this.serialize());
              localStorage.setItem("positions", positions);
            },
          },
          serialize_params: function ($w, wgd) {
            return {
              id: $($w).attr("id"),
              col: wgd.col,
              row: wgd.row,
              size_x: wgd.size_x,
              size_y: wgd.size_y,
            };
          },
          draggable: {
            handle: "header",
            stop: function (event, ui) {
              let positions = JSON.stringify(this.serialize());
              localStorage.setItem("positions", positions);
              // drawVideoArc();
            },
          },
        })
        .data("gridster");
    });
  });

  // $(function () {
  //   $('input[name="daterange"]').daterangepicker(
  //     {
  //       opens: "left",
  //     },
  //     function (start, end, label) {
  //       document.getElementById("allDatesRadio").checked = false;
  //       document.getElementById("courseDatesRadio").checked = false;
  //       updateCharts(
  //         connection,
  //         start.format("YYYY-MM-DD"),
  //         end.format("YYYY-MM-DD"),
  //       ).then(function () {
  //         console.log("Charts updated");
  //       });
  //     },
  //   );
  // });
}
/**
 * Function to update tables and graphs to a learner segment, responds to button click
 * @param segment
 * @param connection
 */
function updateToSegment(segment, connection) {
  connection
    .runSql(
      "SELECT * FROM webdata WHERE name = 'courseDetails_" + segment + "' ",
    )
    .then(function (result) {
      if (result.length === 1) {
        let HtmlString = result[0]["object"]["details"];
        $("#tblGrid tbody").html(HtmlString);
      }
    });
  connection
    .runSql(
      "SELECT * FROM webdata WHERE name = 'databaseDetails_" + segment + "' ",
    )
    .then(function (result) {
      if (result.length === 1) {
        let HtmlString = result[0]["object"]["details"];
        $("#dbGrid tbody").html(HtmlString);
      }
    });
  connection
    .runSql(
      "SELECT * FROM webdata WHERE name = 'mainIndicators_" + segment + "' ",
    )
    .then(function (result) {
      if (result.length === 1) {
        let HtmlString = result[0]["object"]["details"];
        $("#indicatorGrid tbody").html(HtmlString);
      }
    });

  updateChartsBySegment(connection, new Date(), new Date(), segment).then(
    function () {
      console.log("Updated");
    },
  );
}

/**
 * Handles the anchors with graph downloads
 * @param ev
 */
function anchorHandler(ev) {
  const id = ev.currentTarget.id;
  if (id.startsWith("png")) {
    let chartId = id.slice(id.indexOf("_") + 1);
    exportChartPNG(chartId);
  }
}

/**
 * Reads the segmentation type selected, and dynamically generates the necessary buttons
 * @param connection
 */
function segmentationButtons(connection) {
  let query = "SELECT * FROM webdata WHERE name = 'segmentation' ";
  connection.runSql(query).then(function (result) {
    if (result.length > 0) {
      let segmentation = result[0]["object"]["type"];
      let field = document.getElementById("buttons");
      if (segmentation === "ab") {
        let element = document.createElement("button");
        // element.classList.add('btn');
        element.classList.add("btn-primary");
        element.appendChild(document.createTextNode("All Segments"));
        element.addEventListener("click", function () {
          updateToSegment("none", connection);
        });
        field.appendChild(element);

        let elementA = document.createElement("button");
        // elementA.classList.add('btn');
        elementA.classList.add("btn-primary");
        elementA.appendChild(document.createTextNode("Segment A"));
        elementA.addEventListener("click", function () {
          updateToSegment("A", connection);
        });
        field.appendChild(elementA);

        let elementB = document.createElement("button");
        // elementB.classList.add('btn');
        elementB.classList.add("btn-primary");
        elementB.appendChild(document.createTextNode("Segment B"));
        elementB.addEventListener("click", function () {
          updateToSegment("B", connection);
        });
        field.appendChild(elementB);
      }
    }
  });
}

/**
 * Handles the different events for the buttons on the page
 * @param ev
 */
function buttonHandler(ev) {
  let id = ev.currentTarget.id;
  if (id === "clearDB") {
    deleteEverything(connection).then(function () {
      console.log("Cleared Database");
    });
  } else if (id.startsWith("populate")) {
    let courseId = id.slice(id.indexOf("-") + 1);
    populateSamples(courseId, connection);
  } else if (id === "updateChartValues") {
    clearWebdataForUpdate(connection);
  } else if (id.startsWith("dl")) {
    let table = id.slice(id.indexOf("_") + 1);
    processTablesForDownload(table, connection);
  } else if (id === "getForumList") {
    downloadForumSegmentation(connection);
  } else if (id === "getWebdata") {
    webdataJSON(connection);
  }
}

/**
 * Handles changes on the radio inputs
 * @param ev
 */
function inputHandler(ev) {
  const name = ev.currentTarget.name;
  if (name === "dailyOrWeekly" || name === "processedOrInRange") {
    updateCharts(connection).then(function () {
      console.log("Update Charts");
    });
  }
}
