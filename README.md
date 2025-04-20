# Google Drive Clone - Frontend

This is the frontend application for the MERN (MySQL variant) Google Drive clone project. It provides the user interface built with React for interacting with the file and folder management system provided by the backend API.

## ✨ Features

*   User Authentication (Login/Signup forms)
*   JWT-based session management using HttpOnly cookies.
*   Dashboard view for files and folders.
*   Nested folder navigation (Click folders to enter, Breadcrumbs/Up button to go back).
*   File Upload to the currently selected folder.
*   Folder Creation within the currently selected folder.
*   File Download.
*   File Update (Replace content).
*   File & Folder Deletion (with confirmation).
*   User feedback via Toast notifications.
*   Basic responsive table layout for items.

## 🚀 Tech Stack

*   **Framework/Library:** React.js (using Vite or Create React App)
*   **Routing:** React Router DOM (`react-router-dom`)
*   **API Client:** Axios
*   **UI Notifications:** React Toastify (`react-toastify`)
*   **Styling:** Tailwind CSS (or specify if using basic CSS/other libraries)
*   **(Optional) Icons:** React Icons (`react-icons`)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1.  **Node.js and npm (or yarn):** [Download Node.js](https://nodejs.org/) (LTS version recommended)
2.  **Running Backend:** The backend application **must** be running and accessible. See the backend's README for setup instructions.

## ⚙️ Setup & Installation

1.  **Clone the Repository:** If you haven't already, clone the main project repository.
2.  **Navigate to Frontend Directory:**
    ```bash
    cd path/to/google-drive-clone/frontend
    ```
3.  **Install Dependencies:**
    ```bash
    npm install
    # OR if using yarn
    # yarn install
    ```

## 🔧 Configuration

The frontend needs to know the URL of the running backend API.

1.  **API Base URL:** Open the following file:
    `frontend/src/services/api.js` (or your equivalent API configuration file)

2.  **Verify/Update `API_BASE_URL`:** Ensure the `API_BASE_URL` constant points to your running backend server. The default is often:
    ```javascript
    // Inside src/services/api.js
    const API_BASE_URL = 'http://localhost:3000'; // <-- CHANGE THIS PORT if your backend runs elsewhere (e.g., 5001)
    ```
    **This URL must match the address and port where your backend server is listening.**

3.  **(Optional) Environment Variables:** For more robust configuration, especially for different environments (development, production), you could use environment variables:
    *   Create a `.env` file in the `frontend` directory.
    *   Add `VITE_API_BASE_URL=http://localhost:3000` (if using Vite) or `REACT_APP_API_BASE_URL=http://localhost:3000` (if using Create React App).
    *   Update `src/services/api.js` to read this variable: `const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';` (Vite example).

## ▶️ Running the Application (Development)

1.  **Start the Development Server:** Make sure you are in the `frontend` directory.
    ```bash
    # If using Vite
    npm run dev

    # If using Create React App
    npm start
    ```
2.  **Open in Browser:** The application should automatically open in your default browser, or you can navigate to the URL provided in the terminal (usually `http://localhost:5173` for Vite 


