// or ESM/TypeScript import
//import Ajv from "ajv"
const Verbose = 2;

document.addEventListener("DOMContentLoaded", function () {
  if (Verbose > 1) console.clear();
  //if (Verbose>1) console.log("DOM fully loaded and parsed");
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
  if (Verbose) console.log("Collapsed all " + leafsLen + " leafs.");
}

function showLeafs() {
  let leafs = document.getElementsByClassName("leaf");
  let leafsLen = leafs.length;
  for (let i = 0; i < leafsLen; i++) {
    leafs[i].style.display = "block";
  }
  if (Verbose) console.log("Expanded all " + leafsLen + " leafs.");
}

function collapseTree() {
  let checkboxes = document.querySelector(".tree").getElementsByTagName("input");
  let len = checkboxes.length;
  for (let i = 0; i < len; i++) {
    checkboxes[i].checked = "";
  }
  if (Verbose) console.log("Collapsed all " + checkboxes.length + " nodes.");
}

function expandTree() {
  let checkboxes = document.querySelector(".tree").getElementsByTagName("input");
  let len = checkboxes.length;
  for (let i = 0; i < len; i++) {
    checkboxes[i].checked = "checked";
  }
  if (Verbose) console.log("Expanded all " + checkboxes.length + " nodes.");
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
      console.log("%c" + "\n================\nRead new Json file: " + file.name + " with " + file.size + " char (" + (file.size / 1024).toFixed(1) + " KB)", "color:maroon;font-weight:bold;");
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
  if (Verbose > 1) console.log("json validated")
  return true;
}


// https://ajv.js.org/guide/getting-started.html#basic-data-validation
// https://www.npmjs.com/package/ajv

// Node.js require:
/*
const Ajv = require("ajv")

let ajvOptions = "";
if (Verbose>1) ajvOptions = "allErrors: true";
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
  console.error(validate.errors)
} else {
  if (Verbose>1) console.log("Json validated using Ajv")
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
const ExpandedByDefault = true;
let ListItemHTML = "";
let ListLog = ""; // Limits debugging output to a single line

function clearArcTree(treeElement) {
  treeElement.innerHTML = '';
  ListItemHTML = "";
  ListLog = "";
}

/// <summary>
/// Recurse through an 'obj' JSON object & build up an HTML unordered list item (& listLog for debugging)
/// Parameters:
/// 'obj' is the JSON object to be processed, of the following form:
/***
      obj = {
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


function buildArcTree(obj, treeElement, url = "") {
  if (Verbose) console.log("%c" + "buildArcTree: " + obj?.toString() + " url: '" + url + "'", "color:DarkOrchid;font-weight:bold;");

  let childUrl = "";
  for (let key in obj) {
    if (Verbose > 1) console.log("processing: " + key.toString());

    if (obj[key] instanceof Array) {

      if (key == "children") {
        if (obj[key].length == 0) {
          if (Verbose > 1) console.log("No children Array");
        } else {
          if (Verbose > 1) console.log("Got " + Object.keys(obj[key]).length + " children array...");
        }
      } else
        console.warn("Got Unexpected Array: " + obj[key]);
    }

    else if (obj[key] instanceof Object) {
      childUrl = url;
      if (Verbose > 1) console.log("Skipping Object Wrapper: " + key);
    }

    else {
      if (Verbose > 1) console.log("item(" + key + '): ' + obj[key]);
      ListLog += key + '=' + obj[key] + ";  ";

      switch (key) {
        case "title": ListItemHTML += "<b>" + obj[key] + "</b>"; break;

        case "url":
          // autodetect whether json is using relative or full urls
          //if (Verbose>1) console.log("obj[key]: '" + obj[key] + "' url: '" + url + "'");
          if (obj[key].startsWith("http")) {
            childUrl = obj[key];
          } else {
            childUrl = url + obj[key];
          }
          if (Verbose > 1) console.log("Child URL: " + childUrl + ";");

          /*
          // if childUrl is 1 or more nodes deeper than the parent URL, then add a dummy list item in the HTML unordered list to match the JSON structure
          let parentParts = url.toLowerCase().split('/');
          let childParts = childUrl.toLowerCase().split('/');
          if (Verbose > 1) console.log("parentParts: " + parentParts + " childParts: " + childParts);

          debugger;

          for (let j = 0; j < childParts.length; j++) {
            if (j >= parentParts.length) {
              continue;
            }
            if (parentParts[j] != childParts[j]) {
              if (Verbose > 1) console.log("Mismatch: " + parentParts[j] + " != " + childParts[j]);
              break;
            }

            for (let i = 0; i < childParts.length; i++) {
              let dummyLI = document.createElement('li');
              dummyLI.className = "dummy";
              treeElement.appendChild(dummyLI);
            }
          }


          for (let j = 0; j < (childParts.length - parentParts.length); j++) {
            // Create a dummy UL for each missing parent part
            let dummyUrl = childParts.slice(0, parentParts.length + j).join('/');
            let dummyUL = document.createElement('ul');
            dummyUL.className = "dummyPage";
            debugger;
            DumpCaches(obj[key], treeElement, dummyUrl);
            treeElement.appendChild(dummyUL);
          }
        */



          ListLog += "Child URL: " + childUrl + ";";
          ListItemHTML += " (<a href='" + childUrl + "' target='_blank' rel='external' >" + childUrl + "</a>): ";
          break;

        case "meta": ListItemHTML += "<i> " + obj[key] + "</i>"; break;

        // Add other JSON nodes here...

        default: ListItemHTML += " [Unknown key (" + key + ")=" + obj[key] + "] ";
      }
    }

    /// Emit HTML list item for this JSON node
    /// NOTE: assumes that the last JSON key (& only array/object) is "children[...]"
    if (obj[key] instanceof Object) {

      if (ListItemHTML != "") {
        // Dump caches
        DumpCaches(obj[key], treeElement, childUrl);
        /*
        if (Verbose>1) console.log("Emit caches...");
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
        */
      }

      let newUL = treeElement;
      if (obj[key] instanceof Array) {
        newUL = document.createElement('ul');
        // newUL.className = "array"; // or branch?
        treeElement.appendChild(newUL);
      } else if (obj[key] instanceof Object) {
        // no need to create a new UL for non-arrays
        // newUL = treeElement;
      }

      if (Verbose) console.group("children of " + key);
      buildArcTree(obj[key], newUL, childUrl);
      if (Verbose) console.groupEnd();

      childUrl = url;
    }
  } // continue loop thru any remaining keys
}


function DumpCaches(objKey, treeElement, childUrl) {

  // or call DumpCaches(obj[key], treeElement, childUrl)???
  if (Verbose > 1) console.log("Emit caches...");
  // Output list item we've been building up before processing children
  if (Verbose) console.log("log: " + ListLog);
  ListLog = "";

  let uniqueID = Math.floor(Math.random() * 1000000).toString();
  let newLI = document.createElement('li');

  let newInput = document.createElement('input');
  newInput.id = "c" + uniqueID;
  newInput.type = "checkbox";
  newInput.checked = ExpandedByDefault;

  let newLabel = document.createElement('label');
  newLabel.htmlFor = "c" + uniqueID;
  newLabel.className = "tree_label";
  newLabel.innerHTML = DOMPurify.sanitize(ListItemHTML);  //NOTE: Assume untrusted JSON

  // Or if last leaf (no children), add a leaf class
  if (Object.keys(objKey).length == 0) {
    newLI.className = "leaf";
    let newSpan = document.createElement('span');
    newSpan.className = "tree_label";
    newSpan.innerHTML = DOMPurify.sanitize(ListItemHTML);  //NOTE: Assume untrusted JSON
    newLI.appendChild(newSpan);
  }
  ListItemHTML = "";
  treeElement.appendChild(newLI);

  if (Object.keys(objKey).length > 0) {
    newLI.appendChild(newInput);
    newLI.appendChild(newLabel);
  }
  treeElement = newLI;
}