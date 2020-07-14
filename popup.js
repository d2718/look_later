/* popup.js
 * 
 * Look Later popup functionality
 * 
 * updated 2020-07-14
 */
"use strict";

const DEBUG = true;

// Some tuneable constants.

/* If the URI of a link is long, its middle should be replaced by ellipses
 * (...). The following two items dictate how much of the beginning and
 * end of an abbreviated link to show, and also together the maximum length
 * a URI can be before it's abbreviated. */
const HREF_PREV_HEAD_CHARS = 16;
const HREF_PREV_TAIL_CHARS = 16;
/* The date that a link was stores is displayed differently depending on
 * how far in the past it was stored. The following three items define
 * date formates for links stored... */
// ...less than a day ago
const TIME_FMT = new Intl.DateTimeFormat('en',
    { hour: "numeric", minute: "numeric", second: "numeric"});
// ...less than a week ago
const WEEK_DATE_FMT = new Intl.DateTimeFormat('en',
    { weekday: "short", hour: "numeric", minute: "numeric", second: "numeric"});
// ...more than that
const FULL_DATE_FMT = new Intl.DateTimeFormat('en',
    { year: 'numeric', month: 'short', day: '2-digit',
      hour: "numeric", minute: "numeric", second: "numeric"});

// Some computed constants.

// Calculated maximum URI length to display unabbreviated.
const HREF_PREV_LENGTH = HREF_PREV_HEAD_CHARS + HREF_PREV_TAIL_CHARS;
// Shortcut, but also insurance in case this changes in the future.
const STORAGE = chrome.storage.local;

const TIMESTAMP_NOW = Date.now();
const DATE_NOW = new Date();
// Lengths of times in milliseconds.
const ONE_DAY  = 24 * 60 * 60 * 3600
const ONE_WEEK = ONE_DAY * 7;
// Byte counts for formatting the amount of storage used.
const KILO = 1024;
const MEGA = 1024 * 1024;

// The <SPAN> elements the user clicks to sort the link table.
const SORT_SPANS = document.querySelectorAll("span.sort");

 /* debug_dump() is a debugging function that spits out its arguments
 * properties and functions to the console in a particular way.
 */
function debug_dump(obj) {
    let eltz    = [];
    let empties = [];
    let funx    = [];
    for(let k in obj) {
        let v = obj[k];
        if (v === null) empties.push(k);
        else if(v == "") empties.push(k);
        else if(typeof(v) == "function") funx.push(k);
        else eltz.push(`${k}: <${typeof(v)}> ${String(v)}`);
    }
    let output = [
        `<${typeof(obj)}> ${String(obj)}\n\t`,
        eltz.join("\n\t"),
        "\n\tfunctions:\n\t",
        funx.join(', '),
        "\n\tempties:\n\t",
        empties.join(", ")
    ]
    
    console.log(output.join(""));
}

/* scale_size(x) returns a number of bytes scaled in "Kb" or "Mb"
 * as appropriate.
 */
function scale_size(x) {
    if (x < KILO) {
        return x.toString() + " bytes";
    } else if (x < MEGA) {
        let v = x / KILO;
        return v.toPrecision(3) + ' Kb';
    } else {
        let v = x / MEGA;
        return v.toPrecision(3) + ' Mb';
    }
}

/* functions for sorting rows of the links table */
var sort_type = null;
const SORT = {
    'time_forward': function(a, b) { return a.timestamp - b.timestamp; },
    'time_backward':  function(a, b) { return b.timestamp - a.timestamp; },
    'alphabetical':  function(a, b) {
            return a.text.localeCompare(b.text, navigator.language,
                                  { sensitivity: "accent" });
        },
    'omegapsical': function(a, b) {
            return b.text.localeCompare(a.text, navigator.language,
                                  { sensitivity: "accent" });
        },
};

/* invert_color(elt) swaps an element's computed foreground and background
 * colors. This is used to highlight which link sorting method was last
 * used.
 */
function invert_color(elt) {
    let s = window.getComputedStyle(elt, null);
    let bg_col = s.getPropertyValue("background-color");
    let fg_col = s.getPropertyValue("color");
    elt.style.backgroundColor = fg_col;
    elt.style.color = bg_col;
}

/* sort_and_redisplay(evt) sorts the stored link data according to which
 * sorting span was clicked and redisplays the table accordingly.
 * 
 * This is an event handler attached to <SPAN> elements in the <THEAD> of
 * the links table.
 */
function sort_and_redisplay(evt) {
    let targ = evt.target;
    // The <SPAN> that was clicked should have the sort type in its
    // "data" attribute.
    let sort_t = targ.getAttribute("data");
    if (sort_t != sort_type) {
        sort_type = sort_t;
        populate_data();
        for(let s of SORT_SPANS) {
            s.style.backgroundColor = "inherit";
            s.style.color = "inherit";
        }
        invert_color(targ);
    }
}

/* remove(evt) removes the stored link associated with the click event from
 * local storage.
 * 
 * This function returns a Promise that should be awaited, because we want
 * to ensure that the removal has been complete before we do something with
 * the stored data (like re-display the table of links).
 */
function remove(evt) {
    let stamp = evt.target.getAttribute("remove");
    if(DEBUG) console.log(`remove([ evt w/ "${stamp}" ]) called`);
    
    let port = chrome.runtime.connect({name: "default"});
    port.postMessage({type: "remove", payload: stamp});
    
    return new Promise((resolve, reject) => {
        port.onMessage.addListener(function(msg) {
            if (msg.success) {
                resolve();
            } else {
                reject(Error("Background script reports remove request failed."));
            }
        });
    });
}

/* stay_and_remove(evt) removes a stored link without opening it in a new
 * tab. This should be called when the user clicks on a "remove without
 * navigating" button in the table of links.
 */
async function stay_and_remove(evt) {
    if(DEBUG) console.log(`stay_and_remove([ evt w/ "${evt.target.getAttribute("title")}" ]) called`);
    let r = await remove(evt);
    if(DEBUG) {
        console.log(`stay_and_remove(): response rec'd; dump:`);
        debug_dump(r)
    }
    populate_data();
}

/* nav_and_remove(evt) opens a link in a new tab and removes it from local
 * storage; this is the (intended) main pupose of the popup. It should be
 * called when the user clicks on a URL in the table of links.
 */
async function nav_and_remove(evt) {
    let uri = evt.target.getAttribute("title");
    if(DEBUG) console.log(`nav_and_remove[ evt w/ "${uri}" ]) called`);
    let r = await remove(evt);
    if(DEBUG) {
        console.log(`nav_and_remove() rec'd response; dump:`);
        debug_dump(r);
    }
    chrome.tabs.create({ url: uri });
}

/* uri_preview(uri) replaces the middle of long URIs with ellipses.
 */
function uri_preview(uri) {
    if (uri.length < HREF_PREV_LENGTH) return uri;
    
    let head = uri.slice(0, HREF_PREV_HEAD_CHARS);
    let tail = uri.slice(-HREF_PREV_TAIL_CHARS);
    
    return `${head}&hellip;${tail}`;
}

/* date_format(timestamp) formats a timestamp in ms-since-epoch format
 * in a more friendly way; the exact representation depends on how far in
 * the past the date is.
 */
function date_format(timestamp) {
    let date = new Date(timestamp);
    if (TIMESTAMP_NOW - timestamp < ONE_DAY) {
        return TIME_FMT.format(date);
    } else if (TIMESTAMP_NOW - timestamp < ONE_WEEK) {
        return WEEK_DATE_FMT.format(date);
    } else {
        return FULL_DATE_FMT.format(date);
    }
}

/* link_item_line(lnk) takes a link object (as retrieved from local storage)
 * and returns a <TR> element to be inserted in the link table.
 */
function link_item_line(lnk) {
    if(DEBUG) {
        console.log("link_item_line() called; link object dump:");
        debug_dump(lnk);
    }
    
    let timestring = lnk.timestamp.toString();

    let tr_elt = document.createElement("tr");
    //tr_elt.id = ID_PRE + timestring;
    
    let td_elt = document.createElement("td");
    td_elt.setAttribute("class", "uri");
    td_elt.setAttribute("title", lnk.href);
    td_elt.setAttribute("remove", timestring);
    td_elt.addEventListener("click", nav_and_remove);
    td_elt.innerHTML = uri_preview(lnk.href);
    tr_elt.appendChild(td_elt);
    
    td_elt = document.createElement("td");
    td_elt.setAttribute("class", "text");
    td_elt.innerHTML = lnk.text;
    tr_elt.appendChild(td_elt);
    
    td_elt = document.createElement("td");
    td_elt.setAttribute("class", "source");
    td_elt.innerHTML = uri_preview(lnk.origin);
    td_elt.setAttribute("title", lnk.origin);
    tr_elt.appendChild(td_elt);
    
    td_elt = document.createElement("td");
    td_elt.setAttribute("class", "datetime");
    td_elt.innerHTML = date_format(lnk.timestamp);
    tr_elt.appendChild(td_elt);
    
    td_elt = document.createElement("td");
    td_elt.setAttribute("class", "buttons");
    let a_elt = document.createElement("a");
    a_elt.setAttribute("href", lnk.href);
    a_elt.setAttribute("target", "_blank");
    a_elt.setAttribute("title", "navigate without removing");
    let img_elt = document.createElement("img");
    img_elt.setAttribute("src", "images/navigate.png");
    a_elt.appendChild(img_elt);
    td_elt.appendChild(a_elt);

    img_elt = document.createElement("img");
    img_elt.setAttribute("title", "remove without navigating");
    img_elt.setAttribute("remove", timestring);
    img_elt.addEventListener("click", stay_and_remove);
    img_elt.setAttribute("src", "images/remove.png");
    td_elt.appendChild(img_elt);
    
    tr_elt.appendChild(td_elt);
    
    return tr_elt;
}

/* populate_date() retrieves stored link data from local storage, generates
 * the link table, and populates the storage usage stats with the correct
 * number of stored links and the amount of used local storage.
 */
function populate_data() {
    let link_n_span = document.getElementById("link_count");
    let storage_use_span = document.getElementById("storage_report");
    let tbody_elt = document.querySelector("table#links_table tbody");
    tbody_elt.innerHTML = "<tr><td colspan='5' class='msg'>&hellip;</td></tr>";
    
    STORAGE.get("links", function(itemz) {
        if(chrome.runtime.lastError) {
            tbody_elt.innerHTML = "<tr><td colspan='5' class='msg'>[ error ]</td></tr>";
            return;
        }
        
        let lnkz = itemz.links;
        if (lnkz) {
            let lnk_a = [];
            for (let k in lnkz) {
                if (lnkz.hasOwnProperty(k)) lnk_a.push(lnkz[k]);
            }
            let n_links = lnk_a.length;
            
            if (n_links > 0) {
                tbody_elt.innerHTML = "";
                let sort_t = sort_type;
                if (!sort_t) sort_type = "time_forward";
                lnk_a.sort(SORT[sort_t]);
                for (let lnk of lnk_a) {
                    let x = link_item_line(lnk);
                    tbody_elt.appendChild(x);
                }
                link_n_span.innerHTML = n_links.toString();
                return;
            }
        }
        // If no object returned from storage OR object has no keys.
        tbody_elt.innerHTML = "<tr><td colspan='5' class='msg'>[ no stored link items ]</td></tr>";
        link_n_span.innerHTML = "0";
    });
    
    STORAGE.getBytesInUse(null, function(b) {
        if(chrome.runtime.lastError) {
            storage_use_span.innerHTML = "[ error ]";
            return;
        }
        let frac = 100 * b / STORAGE.QUOTA_BYTES;
        let rpt = `${scale_size(b)}&nbsp;(${frac.toPrecision(2)}%)`;
        storage_use_span.innerHTML = rpt;
    });
}

// Actual execution starts here.

window.addEventListener("load", populate_data);

for (let s of SORT_SPANS) s.addEventListener("click", sort_and_redisplay);

STORAGE.get("prefs", function(itemz) {
    if (chrome.runtime.lastError) {
        console.log(`Error reading preferences: ${chrome.runtime.lastError}`);
        return;
    }
    
    let prefz = itemz.prefs;
    if (prefz) {
        let font_str = `${prefz.size}% ${prefz.font}`;
        document.querySelector("body").style.font = font_str;
    }
});
