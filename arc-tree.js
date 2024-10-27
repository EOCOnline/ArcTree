// or ESM/TypeScript import
//import Ajv from "ajv"
let verbose = true;

document.addEventListener("DOMContentLoaded", function () {
  if (verbose) console.clear();
  //if (verbose) console.log("DOM fully loaded and parsed");
  setFontSize(document.querySelector("#fontSize"));
  document.getElementById("arcTreeFile").value = "";
});



/// 'Tree Options' functionality =====================
function setFontSize(el) {
  let fontSize = el.value;
  if (!isNumber(fontSize) || fontSize < 0.5 || fontSize > 5) {
    fontSize = 1;
  }
  document.querySelector(".tree").style.fontSize = fontSize + 'em';
  document.querySelector("#fontSizeValue").innerHTML = fontSize;
  document.querySelector("#fontSize").value = fontSize;
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function collapseLeafs() {
  let leafs = document.getElementsByClassName("leaf");
  let leafsLen = leafs.length;
  for (let i = 0; i < leafsLen; i++) {
    leafs[i].style.display = "none";
  }
  if (verbose) console.log("Collapsed all " + leafsLen + " leafs.");
}

function showLeafs() {
  let leafs = document.getElementsByClassName("leaf");
  let leafsLen = leafs.length;
  for (let i = 0; i < leafsLen; i++) {
    leafs[i].style.display = "block";
  }
  if (verbose) console.log("Expanded all " + leafsLen + " leafs.");
}

function collapseTree() {
  let checkboxes = document.querySelector(".tree").getElementsByTagName("input");
  let len = checkboxes.length;
  for (let i = 0; i < len; i++) {
    checkboxes[i].checked = "";
  }
  if (verbose) console.log("Collapsed all " + checkboxes.length + " nodes.");
}

function expandTree() {
  let checkboxes = document.querySelector(".tree").getElementsByTagName("input");
  let len = checkboxes.length;
  for (let i = 0; i < len; i++) {
    checkboxes[i].checked = "checked";
  }
  if (verbose) console.log("Expanded all " + checkboxes.length + " nodes.");
}



/// Import & Validate Json functionality =====================
async function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    let fileReader = new FileReader();
    fileReader.onload = event => {
      resolve(JSON.parse(event.target.result))
    };
    fileReader.onerror = (error => reject(error));
    fileReader.readAsText(file);
  });
}

async function fileChange(file) {
  readJSONFile(file).then(
    json => {
      console.log("%c" + "\n================\nRead new Json file: " + file.name + " with " + file.size + " char (" + (file.size / 1024).toFixed(1) + " KB), assuming " + (relativeUrlsBool ? "relative" : "full") + " URLS", "color:maroon;font-weight:bold;");
      if (!validateJson(json)) {
        console.error("Invalid JSON: " + json);
        alert("Invalid JSON: " + json);
        return;
      }
      clearArcTree(document.getElementById('unorderedArcTree'));
      buildArcTree(json, document.getElementById('unorderedArcTree'));
    }
  ).catch(
    error => console.error("Error reading file: " + error)
  );
}

function validateJson(json) {
  try {
    if (typeof json !== 'object' || json === null) {
      throw new Error("Invalid JSON object");
    }
  } catch (e) {
    console.error("Invalid JSON: " + e);
    return false;
  }
  if (verbose) console.log("json validated")
  return true;
}


// https://ajv.js.org/guide/getting-started.html#basic-data-validation
// https://www.npmjs.com/package/ajv

// Node.js require:
/*
const Ajv = require("ajv")

let ajvOptions = "";
if (verbose) ajvOptions = "allErrors: true";
const ajv = new Ajv(ajvOptions)
 
const schema = {
  type: "object",
  properties: {
    foo: { type: "integer" },
    bar: { type: "string" },
  },
  required: ["foo"],
  additionalProperties: false,
}
 
const schema2 = {
  type: "object",
  properties: {
    title: { type: "string" },
    url: { type: "string" },
    meta: { type: "string" },
    children: { type: "object" },
  },
  required: ["title"],
  additionalProperties: false,
}
 
const data = {
  foo: 1,
  bar: "abc",
}
 
const data2 = {
  title: "test title",
  url: "test url",
  meta: "test meta",
  children: {
    title: "test title",
    url: "test url",
    meta: "test meta",
    children: {
      title: "test title",
      url: "test url",
      meta: "test meta",
    }
  }
}
 
const validate = ajv.compile(schema)
const valid = validate(data)
if (!valid) {
  if (verbose) console.error(validate.errors)
} else {
  if (verbose) console.log("Json validated using Ajv")
}
 
/// Unused!
function downloadJson() {
  let json = document.getElementById('unorderedArcTree').innerHTML;
  let blob = new Blob([json], { type: "text/plain;charset=utf-8" });
  saveAs(blob, "arcTree.json");
}
 
/// Unused!
function uploadJson() {
  let file = document.getElementById('arcTreeFile').files[0];
  if (file) {
    fileChange(file);
  }
}
*/



/// Tree Creation functionality =====================
let expandedByDefault = true;
let relativeUrlsBool = true; // If true, append child URLs to parent URL
let listItemHTML = "";
let listLog = ""; // For debugging, used to put each JSON node (with multiple keys) onto a single line

function clearArcTree(treeElement) {
  treeElement.innerHTML = '';
  listItemHTML = "";
  listLog = "";
}

/// Allow for JSON objects with relative/partial/incremental or complete/full URLs
function relativeUrls(checked) {
  relativeUrlsBool = checked;
  if (verbose) console.log("relativeUrls: " + relativeUrlsBool);
  clearArcTree(document.getElementById('unorderedArcTree'));
  if (document.getElementById("arcTreeFile").value) {
    fileChange(document.getElementById('arcTreeFile').files[0]);
  }
}

/// <summary>
/// Recurse through an 'o' JSON object & build up an HTML unordered list item (& listLog for debugging)
/// Parameters:
/// 'o' is the JSON object to be processed, of the following form:
/***
      o = {
        "title": "title of web page",
        "url": "relative url of web page",
        "meta": "web page description",
        "children": [{
          "title": "title of child page",
          "url": "relative url of child page",
          "meta": "child page description",
          "children": [{...}, {...}]
        }]
      }
***/
/// 'treeElement' is the HTML element to which the unordered list is to be appended
/// 'url' is this this segment of the tree's full or cumulative (N.B., see above option) url.
///   Initial url should be blank (""): the code pulls the base/home URL from the JSON.
/// </summary>
let childUrl = "";

function buildArcTree(obj, treeElement, url = "") {
  if (verbose) console.log("%c" + "buildArcTree: " + obj?.toString() + " url: '" + url + "'", "color:DarkOrchid;font-weight:bold;");

  for (let key in obj) {
    //if (verbose) console.log("processing: " + i.toString());

    if (obj[key] instanceof Array) {

      if (key == "children") {
        if (obj[key].length == 0) {
          if (verbose) console.log("No children Array");
        } else {
          if (verbose) console.log("Got " + Object.keys(obj[key]).length + " children array...");
        }
      } else
        console.warn("Got Unexpected Array: " + obj[key]);
    }

    else if (obj[key] instanceof Object) {
      if (verbose) console.log("Skipping Object Wrapper: " + key);
    }

    else {
      if (verbose) console.log("item(" + key + '): ' + obj[key]);
      listLog += key + '=' + obj[key] + ";  ";

      switch (key) {
        case "title": listItemHTML += "<b>" + obj[key] + "</b>"; break;

        case "url":
          if (relativeUrlsBool) {
            childUrl = url + obj[key];
          } else {
            childUrl = obj[key];
          }
          if (verbose) console.log("Child URL: " + childUrl + ";");
          listLog += "Child URL: " + childUrl + "; relativeUrlsBool: " + relativeUrlsBool + ";  ";
          listItemHTML += " (<a href='" + childUrl + "' target='_blank' rel='external' >" + childUrl + "</a>): ";
          break;

        case "meta": listItemHTML += "<i> " + obj[key] + "</i>"; break;

        // Add other JSON nodes here...

        default: listItemHTML += " [Unknown key (" + key + ")=" + obj[key] + "] ";
      }
    }

    /// Emit HTML list item for this JSON node
    /// NOTE: assumes that the last JSON key (& only array/object) is "children[...]"
    if (obj[key] instanceof Object) {

      if (listItemHTML != "") {
        // Dump caches
        // or call DumpCaches(obj[key], treeElement, childUrl)???
        if (verbose) console.log("Emit caches...");
        // Output list item we've been building up before processing children
        if (verbose) console.log("log: " + listLog);
        listLog = "";

        let uniqueID = Math.floor(Math.random() * 1000000).toString();
        let newLI = document.createElement('li');

        let newInput = document.createElement('input');
        newInput.id = "c" + uniqueID;
        newInput.type = "checkbox";
        newInput.checked = expandedByDefault;

        let newLabel = document.createElement('label');
        newLabel.htmlFor = "c" + uniqueID;
        newLabel.className = "tree_label";
        newLabel.innerHTML = DOMPurify.sanitize(listItemHTML);  //NOTE: Assume untrusted JSON

        // Or if last leaf (no children), add a leaf class
        if (Object.keys(obj[key]).length == 0) {
          newLI.className = "leaf";
          let newSpan = document.createElement('span');
          newSpan.className = "tree_label";
          newSpan.innerHTML = DOMPurify.sanitize(listItemHTML);  //NOTE: Assume untrusted JSON
          newLI.appendChild(newSpan);
        }
        listItemHTML = "";
        treeElement.appendChild(newLI);

        if (Object.keys(obj[key]).length > 0) {
          newLI.appendChild(newInput);
          newLI.appendChild(newLabel);
        }
        treeElement = newLI;
      }

      let newUL = treeElement;
      if (obj[key] instanceof Array) {
        newUL = document.createElement('ul');
        // newUL.className = "array";
        treeElement.appendChild(newUL);
      } else if (obj[key] instanceof Object) {
        // no need to create a new UL for non-arrays
        //newUL = treeElement;
      }

      if (verbose) console.group("children of " + key);
      buildArcTree(obj[key], newUL, childUrl);
      if (verbose) console.groupEnd();
      childUrl = url;
    }
  }

}

// NOTE: UNUSED!
function DumpCaches(o, treeElement, childUrl) {

  // if (verbose) console.log("=== dump caches!");
  // Output list item we've been building up before processing children
  if (verbose) console.log(listLog);
  listLog = "";

  let uniqueID = Math.floor(Math.random() * 1000000).toString();
  let newLI = document.createElement('li');

  let newInput = document.createElement('input');
  newInput.id = "c" + uniqueID;
  newInput.type = "checkbox";
  newInput.checked = expandedByDefault;

  let newLabel = document.createElement('label');
  newLabel.htmlFor = "c" + uniqueID;
  newLabel.className = "tree_label";
  newLabel.innerHTML = DOMPurify.sanitize(listItemHTML);  //NOTE: Assume untrusted JSON

  // Or if last leaf (no children), add a leaf class
  if (Object.keys(o).length == 0) {
    newLI.className = "leaf";
    let newSpan = document.createElement('span');
    newSpan.className = "tree_label";
    newSpan.innerHTML = DOMPurify.sanitize(listItemHTML);  //NOTE: Assume untrusted JSON
    newLI.appendChild(newSpan);
  }
  listItemHTML = "";
  treeElement.appendChild(newLI);
  if (Object.keys(o).length > 0) {
    newLI.appendChild(newInput);
    newLI.appendChild(newLabel);
  }
  treeElement = newLI;
}