# User Study Report

## Study 1: Shai Bernat-Kunin

### 1. User Information
- **Relationship to user:** Friend
- **Prior app experience:** None — Shai has never used the app before.
- **Experience with similar applications:** None — Shai has never used an application like this before.

### 2. Observation Context
- **Location:** Library / public space
- **Device:** My laptop
- **Instructions given:** I provided context by explaining that the app's function is to generate meme captions from images that the user uploads to a database. I also told him that the app displays previously generated memes that users can vote on if they think they are funny.
- **Tasks:** Free exploration after receiving the context about the app's purpose.

### 3. Three Things the User Liked (Functionality Only)
1. The simplicity of the layout and the flow of memes.
2. The interaction between the user uploading their own photos and the AI doing the rest of the work — he liked only having to do half the work.
3. The app felt very smooth and quick.

### 4. Three Areas for Improvement
1. The layout of everything all at once, with three memes per row, felt hectic and overwhelming. A scrolling feature more similar to current social media apps would be better.
2. There should be some sort of indication that memes are being generated while the system loads — currently it is not clear what is happening.
3. When the caption appeared, it was unclear what was happening next. Does the user select which captions they like best? Are captions automatically saved to the database?

### 5. Observed Friction or Confusion
- Overall, it was unclear what happens at each step — there is not much flow in the UI and it does not feel very interactive.
- The user felt like he did something and then received no validation for it.
- There is a lot of blank space on the page, which contributed to the lack of clarity about what to focus on.

### 6. Behavioral Observations
- Shai engaged with the upload feature after receiving context about the app.
- He appeared to scan the full page of memes at once and expressed that the three-per-row layout was overwhelming.
- He waited for feedback after generating a caption and seemed uncertain whether his action had completed or what came next.
- He did not immediately understand whether voting/selection was part of the caption generation process.

### 7. User Quotes
- "Does the user select which captions they like best? Are the captions automatically saved in the database?"
- "It's nice to only have to do half the work."

---

## Study 2: Evan Lubow

### 1. User Information
- **Relationship to user:** Friend
- **Prior app experience:** None — Evan has never used the app before.
- **Experience with similar applications:** Not specified, though his instincts leaned toward social-media-style interactions (scrolling, liking/disliking).

### 2. Observation Context
- **Location:** Library / public space
- **Device:** His phone
- **Instructions given:** No context was given before the study began.
- **Tasks:** Free exploration. I had to direct him to use the upload feature after he spent time scrolling without engaging with upload.

### 3. Three Things the User Liked (Functionality Only)
1. Browsing memes via scrolling felt like a natural instinct — the scrolling behavior itself worked.
2. The upload feature functioned once directed to it.


### 4. Three Areas for Improvement
1. The app feels bland and not very interactive — needs more engaging elements to draw the user in.
2. Text is hard to read; text size needs to increase so users can actually engage with captions rather than scrolling past them.
3. Add navigation aids such as a refresh button and an easy way to get back to the home screen.

### 5. Observed Friction or Confusion
- Evan was not sure what to do after he uploaded an image.
- He wanted to continue scrolling while waiting for captions to generate, but the interface did not support this.
- He struggled to find an easy way to get back to the home screen.
- His immediate instinct was to scroll and like/dislike quickly without reading captions, because the text was too small to draw him in.

### 6. Behavioral Observations
- Evan first scrolled through the feed on his phone, treating it like a social media app.
- He did not notice or approach the upload feature on his own — I had to direct him to it.
- He hesitated while waiting for captions to generate and tried to navigate elsewhere in the meantime.
- He looked for but could not easily find a "home" button or refresh option.

### 7. User Quotes
- "There should be a refresh button."
- "Swiping would be better than liking — right is good, left is bad, up is 'I don't get it.'"

### 8. Additional Feature Suggestions
- More levels of liking (beyond a binary like/dislike).
- Swipe-based interactions for rating memes.
- A secondary table that stores user-submitted caption suggestions.

---

## Study 3: Madeleine Rosenthal

### 1. User Information
- **Relationship to user:** Sister
- **Prior app experience:** None — Madeleine has never used the app before.
- **Experience with similar applications:** Not specified, but her feedback suggests familiarity with scroll-based social media apps.

### 2. Observation Context
- **Location:** On a bus
- **Device:** Her phone
- **Instructions given:** I gave her the general context that the app generates memes using AI and then let her explore.
- **Tasks:** Free exploration after receiving the general context.

### 3. Three Things the User Liked (Functionality Only)
1. The flow of the app — the scrolling felt engaging and similar to media she is used to.
2. Navigation was easy and the app's functions felt straightforward.
3. She liked the "like" feature.

### 4. Three Areas for Improvement
1. Allow the user to select and download an image of the caption they like best.
2. A swipe-to-like feature could be cool, but she cautioned that sometimes swipe gestures don't work reliably.
3. Add a way to "unlike" something — currently there's no way to undo a like.

### 5. Observed Friction or Confusion
- She was frustrated by how long it took to generate a caption.
- After the captions were generated, she did not know what to do next.
- She noticed there is no way to undo a "like" once it has been given.

### 6. Behavioral Observations
- Madeleine immediately engaged with the scrolling feed, which matched her expectations from other social media apps on her phone.
- She navigated the app confidently and found its core functions without needing guidance.
- She hesitated after triggering caption generation because of the long wait time.
- After captions were produced, she paused and appeared unsure what to do with them.

### 7. User Quotes
- "The scrolling felt engaging — it's like media I already use."
- "There's no way to unlike something."

---

## Final Summary

### Things I Learned from Observing Users
- Users coming in without context struggle significantly more to navigate the app than those who receive an explanation up front. Evan, who received no context, drifted immediately to scrolling behavior and did not discover the upload feature without direction. Shai and Madeleine, who received context, found the upload flow more easily but still had questions about what happened after captions were generated.
- Users expect social-media-style patterns: infinite scrolling, clear feedback on actions, and swipe-based interactions. Madeleine explicitly said the scrolling flow felt familiar, which reinforced that the current grid layout and lack of interactive feedback clashes with user expectations.
- Loading and generation states are invisible to users, which causes confusion about whether their actions have succeeded or are still processing. Madeleine also flagged that generation simply takes too long, making the invisibility of that state even more painful.
- Users want reversibility in their interactions — Madeleine pointed out that once she liked something she could not undo it, which suggests the app needs more forgiving interaction states.

### Things I Found Surprising
- Evan's instinct to treat the app like Tinder (swipe-based directional voting) and Madeleine's suggestion of swipe-to-like converged on the same underlying idea, though Madeleine added the important nuance that swipe gestures are sometimes unreliable in practice.
- Blank space, which I hadn't thought of as a problem, came up explicitly as contributing to the "unclear" feeling of the UI for Shai.
- Madeleine's suggestion to let users download the caption image they like best was a novel idea none of the other users proposed, but I like it as an added function.

### Patterns Noticed Across Multiple Users
- **Unclear next steps after caption generation:** All three users were confused about what to do after a caption appeared. Shai asked if captions were automatically saved; Evan didn't know what to do after uploading; Madeleine paused and wasn't sure what the next action was.
- **Layout and flow preferences:** Shai found the 3-per-row grid overwhelming; Evan wanted continuous scrolling; Madeleine explicitly liked scrolling because it matched familiar social media. All three point toward a feed-style layout.
- **Discoverability and feedback problems:** Key features (upload, home navigation, loading states, undo) were either hard to find or invisible across users.
- **Desire for richer interaction mechanisms:** Shai wanted clearer caption selection, Evan wanted multi-level ratings and swipe gestures, and Madeleine wanted swipe-to-like plus undo and image download.
- **Slowness of caption generation:** Evan wanted to scroll while waiting; Madeleine explicitly complained about the wait time; Shai wanted a loading indicator. The generation step is a consistent pain point across users.

### Planned Improvements Based on These Observations
1. **Redesign the feed as a TikTok-style full-screen scrolling experience.** Rather than a multi-column grid, the app will show one meme at a time, with vertical swiping to move between them. This addresses Shai's overwhelm with the 3-per-row layout, Evan's instinct to scroll, and Madeleine's positive feedback on the familiar feed flow — while making each meme the undivided focus of attention.

2. **Implement swipe-based caption rating.** Users will swipe to rate memes (e.g., right for funny, left for not funny), consistent with Evan and Madeleine's suggestions. Keeping the user on one meme at a time makes swipe gestures more reliable and the interaction more decisive.

3. **Redesign the upload page to actively guide the user through the process.** The upload flow will be visually prominent and draw the user toward it. A progress bar and validation messages will confirm each step — file selected, uploading, generating captions — so users like Shai and Madeleine are never left wondering whether something is happening.

4. **Add favorite caption selection and image download.** After captions are generated, users will be prompted to select their favorite. That caption can then be downloaded as an image. This directly implements Madeleine's suggestion and resolves the widespread confusion about what to do after generation completes.

5. **Increase caption text size and improve visual hierarchy.** Evan scrolled past memes without engaging because the text was too small to read at a glance. Larger, clearly styled caption text will make memes readable immediately, which is especially important in a one-at-a-time full-screen layout.

6. **Add a refresh function that serves unseen memes.** When the user refreshes the feed, they will see memes they haven't encountered yet rather than the same set repeating. This addresses Evan's explicit request for a refresh button and makes the app feel like a living, updating feed.

7. **Add a sidebar to view liked and disliked memes.** Users will be able to access a sidebar that organizes memes they have previously rated, giving them a personal history of their interactions. This addresses Madeleine's request for an "unlike" mechanism (they can manage their ratings here) and gives users a reason to return to the app.