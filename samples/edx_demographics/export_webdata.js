// This script exports the webdata table from the edX database in the ELAT-Workbench course. Webdata contains cycle data for the course, and this script exports the entire table as a JSON file.

async function exportTableRows(dbName, tableName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onerror = (event) => {
      console.error("Database error:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(tableName, "readonly");
      const store = transaction.objectStore(tableName);
      const query = store.getAll();

      query.onerror = (event) => {
        console.error("Query error:", event.target.error);
        reject(event.target.error);
      };

      query.onsuccess = (event) => {
        resolve(event.target.result);
      };
    };
  });
}

function downloadAsJson(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

exportTableRows("edxdb", "webdata")
  .then((rows) => {
    downloadAsJson(rows, "webdata_export.json");
  })
  .catch((error) => {
    console.error("An error occurred:", error);
  });
