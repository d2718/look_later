# look_later
A Chrome extension for replacing the habit of opening new tabs in the
background as a form of temporary bookmarking.

### Installation

After downloading or cloning the repository, flip the switch in the
upper-right-hand corner of the `chrome://extensions` page to enable Developer
Mode. Click "Load unpacked" and choose the directory containing this repo.

### Motivation

According to some of my acquaintances and numerous online sources,
I share a common browsing habit: I see a link to something that I would like
to read, but I don't want to interrupt what I'm reading _now_, so I open it
in a new tab, intending to visit that tab later. I don't _bookmark_ the link
because that would involve interrupting my flow of reading, and in any case
I don't want to _permanently_ remember that link--just long enough to at least
glance at it later.

Having a bunch of tabs open as temporary bookmarks becomes a problem, though,
if one needs to reboot, or wants to close a bunch of applications for
performance (or even just aesthetic) reasons. "Bookmark all tabs..."
isn't a good solution because then one must open up the bookmark manager and
manually clear all those saved bookmarks out. A better solution would be
a set of temporary bookmarks that are automatically deleted once followed.

### Operation

`look_later` provides just that. It adds a "Store to Look Later" option to
the context menu when right-clicking upon links. Choosing that menu item
will store the current link to a set of temporary bookmarks. Clicking on
the extension's icon (
![Look Later icon](https://raw.githubusercontent.com/d2718/look_later/master/images/eyecon-16px.png)
) to the right of the URI bar (where extension icons lurk) brings up a list
of those temporary bookmarks; clicking one of those links opens the target
in a new page and automatically deletes the associated bookmark. (There is
also an option for each bookmark to follow it without deleting it, and one
to delete it without following it.)

### Credits.

`look_later` icon (the eye with the clock hands in it) and navigation icons
by [Freepik](https://www.flaticon.com/authors/freepik) from
[Flaticon](www.flaticon.com).
