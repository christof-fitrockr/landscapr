# Repositories & versions

The **Repositories** page is where the model is loaded, saved and handed over for review. Your model lives in
a GitHub repository, but you never have to think in developer terms: LandscapR talks about drafts, versions
and reviews.

## 1. Connect
1. Enter your **Personal Access Token (PAT)** and click **Connect**.
2. Pick the repository you want to work with.
3. Select the model file and load it into LandscapR.

## 2. Start a draft
Straight after loading you are **reading the published model** - the version everybody else sees. It cannot be
changed directly, so nothing is broken by accident.

Click **Start a draft** to get your own workspace. From that moment on every change you make stays in your
draft until you hand it over. The workspace card shows which draft you are in and switches from `READING`
to `DRAFT`.

## 3. Save versions
While you work, click **Save version** whenever you reach a state worth keeping. LandscapR asks **what
changed** - one short sentence is enough, it is what reviewers read later. Several saved versions in the
same draft are perfectly normal.

If somebody else changed the model in the meantime, a **Differences to resolve** window opens. For every
element you decide whether to keep **your version** or take the one **in the repository**; then you save as
usual.

## 4. Submit for review
When the draft is ready, click **Submit for review**. Your draft goes to the reviewers as a change proposal.
They decide whether it becomes part of the published model. Everything currently waiting for a decision is
listed under **Changes waiting for review**.

Afterwards you can go back to the published model, or stay in the draft and keep working.

**Discard draft** leaves the draft without submitting it - useful when you were only trying something out.

## 5. Working without GitHub
- **Download local:** saves the current model as a JSON file on your computer.
- **Upload local:** replaces the current model with a JSON file from your computer.

## What the words mean
The repository underneath is an ordinary Git repository, so if you or a colleague look at it with developer
tools, this is how the two vocabularies match up:

| In LandscapR | In the repository |
|---|---|
| Draft workspace | branch |
| Published model | default branch (`main`) |
| Save version | commit |
| What changed? | commit message |
| Submit for review | pull request |
| Changes waiting for review | open pull requests |
| Differences to resolve | merge conflict |
| Get latest published model | pull |
