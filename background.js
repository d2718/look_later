/* background.js
 * 
 * Look Later background script
 * 
 * updated 2020-07-12
 */

/* Stored Link Format
 * 
 * Links are stored in chrome.storage.local under the key "links"; this object
 * is itself a map of key:value pairs. The key of each pair is a string
 * representation of the timestamp when the link was added; the value is
 * a "link object" thus:
 * 
 * {
 *     timestamp: <integer> ms-since-epoch when the link was stored,
 *     href: <String> URI of the stored link,
 *     text: <String> text of the DOM element that was right-clicked,
 *     origin: <String> hostname/pathname of the page from which the
 *                      link was stored
 * }
 */

const DEBUG = true;

const MENU_ITEM_ID = "ll_add";
const STORAGE = chrome.storage.local;

var current_link = null;

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

/* len(obj) returns the number of keys an object has.
 * 
 * This is here because I need to do this in several places, and it's
 * more concise to look at than the code it replaces.
 */
function len(obj) { return Object.keys(obj).length; }

function set_badge_n(n) {
    if (n > 999) {
        chrome.browserAction.setBadgeText({"text": "999+"});
    } else if (n <= 0) {
        chrome.browserAction.setBadgeText({"text": ""});
    } else {
        chrome.browserAction.setBadgeText({"text": n.toString()});
    }
}


/* get_stored_links() returns a Promise that resolves to the object that
 * holds the data on all saved links.
 * 
 * A promise is returned because opreations involving chrome.storage.local
 * tend to be async, and we want a function we can wait on to return
 * a value.
 */
function get_stored_links() {
    if(DEBUG) console.log("get_stored_links() called");
    return new Promise(function(resolve, reject) {
        STORAGE.get("links", function(itemz) {
            if (chrome.runtime.lastError) {
                console.log(`get_stored_links(): call to STORAGE.get() returns error: ${chrome.runtime.lastError}`);
                reject(chrome.runtime.lastError);
            }
            if (itemz.links) {
                resolve(itemz.links);
            } else {
                let blank = {};
                resolve(blank);
            }
        });
    });
}

/* store_link(lnk) , as it says on the tin, stores the given link object in
 * chrome.storage.local. It also calls set_badge_n() to update the icon
 * badge with the appropriate link count.
 */
function store_link(lnk) {
    STORAGE.get("links", function(itemz) {
        if (chrome.runtime.lastError) {
            console.log(`LL: store_link([ <link obj> "${lnk.href}" ]): STORAGE.get("links") threw error: ${chrome.runtime.lastError}`);
            return;
        }
        let lnkz = itemz.links;
        if (! lnkz) lnkz = {};
        lnkz[lnk.timestamp.toString()] = lnk;
        let n_links = Object.keys(lnkz).length;
        STORAGE.set({"links": lnkz}, function() {
            if (chrome.runtime.lastError) {
                console.log(`LL: store_link([ <link obj> "${lnk.href}" ]): STORAGE.set(...) threw error: ${chrome.runtime.lastError}`);
                return;
            }
            if(DEBUG) console.log(`LL: store_link([ <link obj> "${lnk.href}" ]): STORAGE.set(...) link stored successfully.`);
            set_badge_n(n_links);
        });
    });
}

/* remove_item(stamp) deletes the stored link item with the provided
 * timestamp from chrome.storage.local, updates the badge count, and
 * returns a Promise that resolves when complete.
 * 
 * Returning a promise is necessary because we want to be able to wait
 * for this action to complete before we read the stored links from
 * local storage again.
 */
function remove_item(stamp) {
    if(DEBUG) console.log(`remove_item("${stamp}") called`);
    return new Promise((resolve, reject) => {
        STORAGE.get("links", function(itemz) {
            if (chrome.runtime.lastError) {
                console.log(`remove_item(): STORAGE.get() Error: ${chrome.runtime.lastError}`);
                reject(chrome.runtime.lastError.toString());
            }
            let lnkz = itemz.links;
            if (lnkz) {
                delete lnkz[stamp];
                let new_len = len(lnkz);
                STORAGE.set({"links": lnkz}, function() {
                    if (chrome.runtime.lastError) {
                        console.log(`remove_item(): STORAGE.set(...) error: ${chrome.runtime.lastError}`);
                        reject(chrome.runtime.lastError.toString());
                    }
                    if(DEBUG) console.log("remove_item(): success");
                    set_badge_n(new_len);
                    resolve();
                });
            } else {
                reject(Error("Can't find any stored items to remove."));
            }
        });
    });
}

/* context_menu_clicked(obj) obviously is set to fire when the "Store to Look
 * Latet" item is selected from the context menu; it stores the current
 * link in local storage.
 */
function context_menu_clicked(obj) {
    if (DEBUG) {
        console.log("LL: context_menu_clicked(obj) called\ndump of obj:");
        debug_dump(obj);
    }
    if (obj.menuItemId == MENU_ITEM_ID) {
        if (current_link) store_link(current_link);
    }
}

/* When the extension is installed, it:
 *   + adds a context menu item "Store to Look Later"
 *   + sets three event listeners
 *       - to store the current item when the context menu item is clicked
 *       - to listen for messages from the popup script that contain info
 *         about the link upon which the user has opened the context menu
 *       - to listen for connections from the popup asking for stored
 *         links to be cleared/deleted/removed.
 *   + counts the stored links and sets the badge number
 */
chrome.runtime.onInstalled.addListener(function() {
    if(DEBUG) {
        console.log('LL: installed listener firing');
        console.log(`LL: extension ID is "${chrome.runtime.id}"`);
    }
    
    chrome.contextMenus.create({
        id: MENU_ITEM_ID,
        title: "Store to Look Later",
        type: "normal",
        contexts: [ "link" ]
    });
    
    chrome.contextMenus.onClicked.addListener(context_menu_clicked);
    
    chrome.runtime.onMessage.addListener(
        function(request, sender, send_response) {
            if (DEBUG) {
                console.log("LL: message listener fired");
                console.log(`LL: message from ID: "${sender.id}", URL: "${sender.url}"`);
                console.log("LL: message dump:");
                debug_dump(request);
            }
            if(request.type == "link") {
                if (DEBUG) {
                    console.log("LL: link properties:");
                    debug_dump(request.payload);
                }
                current_link = request.payload;
            }
            return true;
        }
    );
    
    chrome.runtime.onConnect.addListener(async function(port) {
        if(DEBUG) console.log("port connection listener fired");
        port.onMessage.addListener(async function(msg) {
            if(DEBUG) {
                console.log("port rec'd message; dump:");
                debug_dump(msg);
            }
            if (msg.type == "remove") {
                let r = await remove_item(msg.payload);
                port.postMessage({success: true});
            }
        });
    });
    
    STORAGE.get("links", function(itemz) {
        if(itemz.links) {
            set_badge_n(len(itemz.links));
        } else {
            set_badge_n(0);
        }
    });
    
    if(DEBUG) console.log("installed listener ends");
});

