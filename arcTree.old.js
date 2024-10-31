// or ESM/TypeScript import
//import Ajv from "ajv"
const Verbose = 2;

document.addEventListener("DOMContentLoaded", function () {
  if (Verbose > 1) console.clear();
  //if (Verbose>1) console.log("DOM fully loaded and parsed");
  setFontSize(document.querySelector("#arctree-font-size"));
  document.getElementById("arctree-file").value = "";
});



/// 'Tree Options' functionality =====================
function setFontSize(el) {
  let fontSize = el.value;
  if (!isNumber(fontSize) || fontSize < 0.5 || fontSize > 5) {
    fontSize = 1;
  }
  document.querySelector(".arctree").style.fontSize = fontSize + 'em';
  document.querySelector("#arctree-font-size-value").innerHTML = fontSize;
  document.querySelector("#arctree-font-size").value = fontSize;
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
  let checkboxes = document.querySelector(".arctree").getElementsByTagName("input");
  let len = checkboxes.length;
  for (let i = 0; i < len; i++) {
    checkboxes[i].checked = "";
  }
  if (Verbose) console.log("Collapsed all " + checkboxes.length + " nodes.");
}

function expandTree() {
  let checkboxes = document.querySelector(".arctree").getElementsByTagName("input");
  let len = checkboxes.length;
  for (let i = 0; i < len; i++) {
    checkboxes[i].checked = "checked";
  }
  if (Verbose) console.log("Expanded all " + checkboxes.length + " nodes.");
}



/// Import & Validate Json functionality =====================
async function fileChange(file) {
  readJSONFile(file).then(
    json => {
      console.log("%c" + "\n================\nRead new Json file: " + file.name + " with " + file.size + " char (" + (file.size / 1024).toFixed(1) + " KB)", "color:maroon;font-weight:bold;");
      if (!validateJson(json)) {
        console.error("Invalid JSON: " + json);
        alert("Invalid JSON: " + json);
        return;
      }
      clearArcTree(document.getElementById('unordered-arctree'));
      buildArcTree(json, document.getElementById('unordered-arctree'));
    }
  ).catch(
    error => console.error("Error reading file: " + error)
  );
}

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
  let json = document.getElementById('unordered-arctree').innerHTML;
  let blob = new Blob([json], { type: "text/plain;charset=utf-8" });
  saveAs(blob, "arcTree.json");
}
 
/// Unused!
function uploadJson() {
  let file = document.getElementById('arctree-file').files[0];
  if (file) {
    fileChange(file);
  }
}
*/



/// Tree Creation functionality =====================
const ExpandedByDefault = true;
let ListItemHTML = "";
let DummyUrl = ""; // track current dummy URL, if any
let DummyTreeElement = "";
let ListLog = ""; // Limits debugging output to a single line

function clearArcTree(treeElement) {
  treeElement.innerHTML = '';
  ListItemHTML = "";
  ListLog = "";
}

/// <summary>
/// Recurse through an 'obj' JSON object & build up an HTML unordered list item (& listLog for debugging)

/// As we loop thru the JSON object, we get a bit of info at a time.
/// In order to write a complete block of HTML composed of these bits, we 
/// stash the bits in ListItemHTML.
/// Likewise to write only one line into the debug log (not lots of bits) we cache debug info into ListLog.
/// When we finish looping through the JSON node, we write the entire HTML block for that node.

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
/// 'url' is this this segment of the arctree's full or cumulative (N.B., see above option) url.
///   Initial url should be blank (""): the code pulls the base/home URL from the JSON.
/// </summary>


function buildArcTree(obj, treeElement, parentUrl = "") {
  if (Verbose) console.log("%c" + "buildArcTree: " + obj?.toString() + " url: '" + parentUrl + "'", "color:DarkOrchid;font-weight:bold;");

  let childUrl = "";
  for (let key in obj) {
    if (Verbose > 1) console.log("processing: '" + key.toString() + "' = '" + obj[key] + "'");

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
      childUrl = parentUrl;
      if (Verbose > 1) console.log("Skipping Object Wrapper: " + key);
    }

    else {
      //if (Verbose > 1) console.log("item(" + key + '): ' + obj[key]);
      ListLog += key + '=' + obj[key] + ";  ";

      switch (key) {
        case "title": ListItemHTML += "<b>" + obj[key] + "</b>"; break;

        case "url":
          // autodetect whether json is using relative or full urls
          //if (Verbose>1) console.log("obj[key]: '" + obj[key] + "' url: '" + url + "'");
          if (obj[key].toLowerCase().startsWith("http")) {
            childUrl = obj[key];
          } else {
            childUrl = parentUrl + obj[key];
          }
          if (Verbose > 1) console.log("Child URL: " + childUrl + ";");

          if (parentUrl != "") {
            // parentUrl=="" indicates 1st time thru. childUrl should have 3 parts: protocol, domain, and path.
            // Don't check for dummy in this case.
            console.assert(childUrl.toLowerCase().startsWith("http"), "childUrl: " + childUrl + " didn't start with http!!!");

            if (DummyUrl != "") {
              // current node is a 'dummy' URL
              // parentUrl = DummyUrl;
            }

            // Add a dummy list item if the URLs in the JSON structure's path 'jump' more than one level so the user can collapse/expand every level.
            // e.g., from from https://ibm.com/ to https://ibm.com/child1/child2 -- without going thru https://ibm.com/child1 first.
            let parentParts = parentUrl.toLowerCase().split('/');
            let childParts = childUrl.toLowerCase().split('/');
            let dummyParts = DummyUrl.toLowerCase().split('/');
            if (Verbose > 1) console.log("parentParts: " + parentParts + " childParts: " + childParts + " dummyParts: " + dummyParts);

            let iCommonPart = 0; // index of the common part of parent & child URLs

            while (iCommonPart < parentParts.length && iCommonPart < childParts.length && parentParts[iCommonPart] == childParts[iCommonPart]) {
              iCommonPart++;
            }

            let iDummyPart = 0; // index of the common part of parent & child URLs

            while (iDummyPart < dummyParts.length && iDummyPart < childParts.length && dummyParts[iDummyPart] == childParts[iDummyPart]) {
              iDummyPart++;
            }

            if (Verbose > 1) console.log("iCommonPart: " + iCommonPart + "; parentParts: " + parentParts + "; childParts.length: " + childParts.length + "; iDummy: " + iDummyPart);

            //debugger;

            if (iCommonPart >= iDummyPart) {
              if (Verbose > 1) console.log("Use parentURL: " + parentUrl + " to " + childUrl);
            } else {
              if (Verbose > 1) console.log("Need to create a dummyURL! " + DummyUrl + "[" + iDummyPart + "] parts to " + childUrl);
              parentParts = dummyParts;
              //debugger;
              treeElement = DummyTreeElement;
            }

            for (let iDummy = parentParts.length + 1; iDummy < childParts.length; iDummy++) {
              // Create a dummy node to allow collapsing/expanding every level of the tree!
              if (Verbose) console.log("Dummy #" + (childParts.length - (parentParts.length + 1)) + " needed: " + parentUrl + " to " + childUrl);

              // dummy HTML = Title + Url + Meta
              let dummyHTML = "<span class='arctree-dummy-node'><b>" + childParts.slice(iDummy - 1, iDummy) + "</b>";
              DummyUrl = childParts.slice(0, iDummy).join('/');
              dummyHTML += " (<a href='" + DummyUrl + "' target='_blank' >" + DummyUrl + "</a>): ";
              dummyHTML += "<i>Artificial intermediate node, URL may not exist & get 404 errors</i></span>";
              let dummyLog = "Dummy HTML: " + dummyHTML + ";";
              DummyTreeElement = treeElement; // Keep track of original treeElement, so siblings can also be added to it.

              //debugger;

              treeElement = WriteUlListItem(obj[key], treeElement, dummyHTML, dummyLog);
              if (Verbose > 1) console.log("Adding dummy: " + dummyHTML);
              if (Verbose) console.groupEnd();

              // childUrl = DummyUrl;
              // parentUrl = DummyUrl;
              // DummyUrl is set above, so we can use it to create the next dummy node
              // DummyTreeElement also set above so siblings can also be added to it.
            } // done creating any needed dummy nodes...
          }

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
        // Dump caches before processing children
        treeElement = WriteUlListItem(obj[key], treeElement, ListItemHTML, ListLog);
        ListItemHTML = "";
        ListLog = "";
      }

      let newUL = treeElement;
      if (obj[key] instanceof Array) {
        newUL = document.createElement('ul');
        // newUL.className = "array"; // or branch?
        treeElement.appendChild(newUL);
      } else if (obj[key] instanceof Object) {
        // no need to create a new UL for non-arrays
        // newUL = treeElement;
        // newUL.className = "arctree-object";
      }

      // Recurse into children
      if (Verbose) console.group("children of " + key);
      buildArcTree(obj[key], newUL, childUrl);
      if (Verbose) console.groupEnd();

      childUrl = parentUrl;
    }
  } // continue loop thru any remaining keys
}

/// <summary>
/// Reading from the JSON file gets one bit of info sequentially. 
/// We want to write a complete block of HTML composed of these bits.
/// So we have been building up parts of the HTML block while 
/// iterating though a JSON node, and can now output the entire 
/// HTML block for that node.
/// </summary>
function WriteUlListItem(objKey, treeElement, listItemHTML, listLog) {
  if (Verbose > 1) console.log("Emit caches...");
  // Output list item we've been building up before processing children
  if (Verbose) console.log("log: " + listLog);

  let uniqueID = Math.floor(Math.random() * 1000000).toString();
  let newLI = document.createElement('li');

  let newInput = document.createElement('input');
  newInput.id = "c" + uniqueID;
  newInput.type = "checkbox";
  newInput.checked = ExpandedByDefault;

  let newLabel = document.createElement('label');
  newLabel.htmlFor = "c" + uniqueID;
  newLabel.className = "arctree-label";
  newLabel.innerHTML = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(listItemHTML) : listItemHTML;  //NOTE: Assume untrusted JSON

  // Or if last leaf (no children), add a leaf class
  if (Object.keys(objKey).length == 0) {
    newLI.className = "leaf";
    let newSpan = document.createElement('span');
    newSpan.className = "arctree-label";
    newSpan.innerHTML = DOMPurify.sanitize(listItemHTML);  //NOTE: Assume untrusted JSON
    newLI.appendChild(newSpan);
  }
  treeElement.appendChild(newLI);

  if (Object.keys(objKey).length > 0) {
    newLI.appendChild(newInput);
    newLI.appendChild(newLabel);
  }
  treeElement = newLI;
  return treeElement;
}