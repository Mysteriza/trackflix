# TrackFlix 🎬

Welcome to TrackFlix, your personal application for managing and tracking movies and TV series. Keep a record of what you want to watch, what you've already seen, and optionally share your public watchlist with others. This application is built using Next.js, Firebase, and Tailwind CSS.

## ✨ Features

**Watchlist Management:**

* **Add Items:** Manually add movies or series to your personal watchlist.
* **Track Status:** Maintain separate lists for Movies and Series you intend to watch.
* **Mark as Watched:** Move items to your watched history easily when completed.
* **Details & Notes:** Include personal notes for each item and specify if content is D21+ (Adult Content). For series, track your progress by season and episode number.
* **Folders:** Organize items into custom folders for better categorization (e.g., "Sci-Fi Favorites", "Documentaries").
* **Drag & Drop Reordering:** Reorder items within your lists or folders using drag and drop on desktop.
* **Mobile Reordering:** Use dedicated up/down arrows for reordering on mobile devices.
* **Edit Items:** Modify the title, notes, type (movie/series), or D21+ status of any item.
* **Move Items:** Easily transfer items between different folders or back to the main list.
* **Bulk Actions:** Select multiple items at once to efficiently move them to a folder or delete them.

**Watched List:**

* **History:** Access a clear overview of all items you have marked as watched.
* **Rating & Review:** Rate watched items on a 0-10 scale (including decimals) and add personal reviews or notes.
* **Timestamp:** The date and time an item is marked as watched are automatically recorded.
* **Search & Sort:** Find specific items in your watched history using title search. Sort the list by watched date (newest/oldest) or title (A-Z/Z-A).
* **Folder Organization:** Watched items maintain their folder assignments, enabling grouped viewing.
* **Quick Add:** Quickly add multiple titles directly to your watched list, useful for logging past viewing history.
* **Statistics:** View counts of total watched items, movies, and series on your profile and the watched list tab.
* **Unwatch:** Correct mistakes by moving an item from your watched history back to your watchlist.

**Social Features:**

* **User Profiles:** Each user has a profile page showing their display name, email, and watched statistics.
* **Public/Private Watchlist:** Control the visibility of your watchlist through your profile settings.
* **Discover Users:** Find other TrackFlix users by searching their display name via the Social page.
* **View Public Profiles:** Visit profiles of users who have set their watchlists to public to see their stats and lists.

**Account & Data Management:**

* **Authentication:** Secure user sign-up and login managed by Firebase Authentication.
* **Profile Management:** Adjust your watchlist's public/private visibility in your profile settings.
* **Data Export:** Download a complete backup of your watchlist and folder structure in JSON format.
* **Data Import:**
    * **Watched List Import:** Add watched titles from a JSON file, skipping any duplicates already present.
    * **Full Data Import:** Restore your entire account data (watchlist and folders) from a backup file (this will replace your current data).
* **Delete Account:** Permanently remove your account and all associated data after confirming your identity.
* **Session Management:** Sessions expire after a period of inactivity for security, but activity resets the timer.

**Utilities:**

* **Duplicate Finder:** Scan your lists for items with similar titles and remove duplicates easily.
* **Dark/Light Mode:** Switch between visual themes according to your preference or system settings.
* **Responsive Design:** The application is designed to work well on desktop, tablet, and mobile devices.

## 🛠️ Tech Stack

* **Framework:** Next.js (React)
* **Language:** TypeScript
* **Backend & Database:** Firebase (Authentication, Firestore)
* **Styling:** Tailwind CSS
* **UI Components:** shadcn/ui
* **State Management/Forms:** React Hooks, react-hook-form
* **Realtime Updates:** Firebase Firestore real-time listeners
