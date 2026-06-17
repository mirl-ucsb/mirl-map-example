# Setting up the editor, and publishing your map

Good news: if you made your map from MIRL's template, the trickiest part, the
"Log in with GitHub" sign-in, is **already handled for you** by a shared login
helper that MIRL hosts. You do not set up any login of your own. There are just
two small things to do to publish, and then editing is a simple web form.

This page covers two things:

1. **Trying the editor on your own computer**, with nothing to set up.
2. **Publishing your map online**, which is now just two short steps.

---

## 1. Try the editor on your own computer (no setup, no accounts)

You can run the editor against the copy of the project on your own computer, with
no login. A nice way to get a feel for it.

You will use **Terminal** (it comes with every Mac; on Windows it is **Command
Prompt** or **PowerShell**). Open it, type these two lines (the second in a new
window), and press Return after each:

```
npx decap-server
```
```
python3 -m http.server 8766
```

Now open your browser at **http://localhost:8766/admin/**, click **Login** (no
password is needed in this local mode), and edit. Your changes save to the copy on
your computer. Nothing goes online until you publish.

---

## 2. Publish your map online (two short steps)

**Step 1. Tell the editor which repository is yours.**
Open `admin/config.yml` and set the `repo:` line to your project's name on GitHub,
for example:

```yaml
backend:
  name: github
  repo: mirl-ucsb/my-harbor-map      # <- change this to YOUR repository
  branch: main
  base_url: https://mirl-map-auth.mirl-ucsb.workers.dev   # leave this as-is (MIRL's shared login)
```

Leave the `base_url` line exactly as it is. That is MIRL's shared login helper,
already set for you.

**Step 2. Turn on free web hosting.**
In your project on GitHub: **Settings → Pages → Source: GitHub Actions.** Your map
publishes at `https://your-user.github.io/your-repo/`.

That is everything. Visit `https://your-user.github.io/your-repo/admin/`, click
**Log in with GitHub**, authorize once, and you are editing.

---

## Inviting people to edit

Anyone you want to let edit the map needs **edit access to the project on GitHub**.
Because your project lives in a GitHub organization (for MIRL, that is
**mirl-ucsb**), members you add with that access can use the editor straight away.
People without access can still view the published map.

---

## How your editors use it

1. Go to your map's address followed by `/admin` and click **Log in with GitHub**.
2. Choose **Photographs → New Photograph.** Drag in the image, type a **caption**,
   and (optionally) write the **narrative.** Leave the location and other technical
   boxes empty; they are read from the photograph itself.
3. Click **Publish.** Within about a minute, your change appears on the live map.

---

## What happens behind the scenes

Each photograph you add is saved as a small text file, and a helper on GitHub
turns your photographs into the finished map, makes the small and medium image
sizes, and reads the location from each photo. You just add photographs and words.

---

## Running your own login helper (advanced, optional)

Almost no one needs this. The "Log in with GitHub" is provided by a small helper
MIRL hosts, so you do not have to. If you ever want to run your own (for full
independence from MIRL's infrastructure), it is a tiny Cloudflare Worker: see the
`mirl-map-auth` project for the one-time deploy steps, then point your
`admin/config.yml` `base_url` at your own copy.

---

## If you get stuck

The MIRL team is glad to help.
