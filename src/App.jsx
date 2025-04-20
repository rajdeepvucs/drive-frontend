import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Don't forget CSS

// --- Helper: Create Hidden Input ---
const createFileInput = (onChangeCallback) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    fileInput.onchange = onChangeCallback;
    document.body.appendChild(fileInput);
    return fileInput;
};

// --- Helper: Format Bytes ---
const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes' // Handle 0 or non-numeric input
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    // Prevent index out of bounds for extremely large numbers
    const index = Math.min(i, sizes.length - 1);
    return `${parseFloat((bytes / Math.pow(k, index)).toFixed(dm))} ${sizes[index]}`
};

// --- Component: Breadcrumbs ---
function Breadcrumbs({ path, onNavigate, isLoading }) {
    return (
        <nav aria-label="breadcrumb" className={`breadcrumbs mb-4 text-sm text-gray-600 ${isLoading ? 'opacity-50' : ''}`}>
            <ol className="breadcrumb-list flex items-center space-x-1 sm:space-x-2 flex-wrap">
                {path.map((folder, index) => (
                    <li key={folder.id ?? 'root'} className="breadcrumb-item flex items-center">
                        {/* Make clickable only if not the last item AND not loading */}
                        {(index < path.length - 1) ? (
                            <button
                                onClick={() => !isLoading && onNavigate(folder.id, folder.name)}
                                className="breadcrumb-link hover:underline text-blue-600 disabled:text-gray-500 disabled:no-underline"
                                disabled={isLoading}
                            >
                                {folder.name}
                            </button>
                        ) : (
                            <span aria-current="page" className="breadcrumb-current font-semibold text-gray-800 truncate" title={folder.name}>
                                {folder.name}
                            </span>
                        )}
                        {index < path.length - 1 && <span className="breadcrumb-separator text-gray-400 mx-1">/</span>}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

// --- Main App Component ---
export default function App() {
    // --- State ---
    const [user, setUser] = useState(null);
    const [isAuthenticating, setIsAuthenticating] = useState(true); // Track initial auth check
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [items, setItems] = useState([]);
    const [fileToUpload, setFileToUpload] = useState(null);
    const [folderName, setFolderName] = useState('');
    const [isLoading, setIsLoading] = useState(false); // For API calls/fetching
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [breadcrumbPath, setBreadcrumbPath] = useState([{ id: null, name: 'Root' }]);

    // --- Refs ---
    const updateFileInputRef = useRef(null);
    const fileToUpdateIdRef = useRef(null);

    // --- Config ---
    const API_BASE_URL = 'http://localhost:3000'; // <-- IMPORTANT: Verify this port!

    // --- Fetching Logic ---
    // useCallback helps prevent re-creating the function on every render
    const fetchItems = useCallback(async (folderId) => {
        console.log(`Fetching items for folderId: ${folderId}`);
        setIsLoading(true); // Start loading indicator
        let fetchedFolders = [];
        let fetchedFiles = [];

        try {
            const [folderRes, fileRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/folders`, { params: { parentId: folderId }, withCredentials: true }),
                axios.get(`${API_BASE_URL}/api/files`, { params: { folderId }, withCredentials: true })
            ]);

            console.log("API Response Folders:", folderRes);
            console.log("API Response Files:", fileRes);

            // Process folders (assuming direct array response based on updated backend)
            if (Array.isArray(folderRes?.data)) {
                fetchedFolders = folderRes.data.map(f => ({ ...f, type: 'folder' }));
                console.log("Processed Folders:", fetchedFolders)
            } else {
                // Handle case where backend might still wrap it (less likely now)
                 if (Array.isArray(folderRes?.data?.folders)) {
                    fetchedFolders = folderRes.data.folders.map(f => ({ ...f, type: 'folder' }));
                    console.log("Processed Folders (nested):", fetchedFolders);
                 } else {
                    console.warn("Received unexpected data format for folders:", folderRes?.data);
                 }
            }

            // Process files (assuming direct array response)
            if (Array.isArray(fileRes?.data)) {
                fetchedFiles = fileRes.data.map(f => ({ ...f, type: 'file' }));
                 console.log("Processed Files:", fetchedFiles);
            } else {
                console.warn("Received unexpected data format for files:", fileRes?.data);
            }

             // Combine, sort (folders first, then alphabetically), and update state
             const combinedItems = [...fetchedFolders, ...fetchedFiles];
             combinedItems.sort((a, b) => {
                 // Folders come before files
                 if (a.type === 'folder' && b.type === 'file') return -1;
                 if (a.type === 'file' && b.type === 'folder') return 1;
                 // Otherwise, sort alphabetically by name
                 return a.name.localeCompare(b.name);
             });
             setItems(combinedItems);

        } catch (err) {
            toast.error('Failed to fetch items.');
            console.error('Fetch error:', err.response?.data || err.message || err);
            if (err.response?.status === 401) {
                // Use handleLogout to clear state correctly, suppress toast if desired
                handleLogout(false);
                toast.info("Session expired. Please log in again.");
            }
            if (err.response?.status === 404 && folderId !== null) { // Only redirect if not fetching root
                 toast.warn("Folder not found, returning to root.");
                 navigateToFolder(null, 'Root'); // Go back to root
            }
        } finally {
            setIsLoading(false); // Stop loading indicator regardless of success/error
        }
    }, []); // Empty dependency array because it doesn't depend on component state directly

    // --- Navigation Logic ---
    // Separate function to handle navigation and state updates together
    const navigateToFolder = useCallback((folderId, folderName) => {
        console.log(`Navigating to folder: ID=${folderId}, Name=${folderName}`);
        setCurrentFolderId(folderId);

        // Update breadcrumbs state
        if (folderId === null) {
            setBreadcrumbPath([{ id: null, name: 'Root' }]);
        } else {
            setBreadcrumbPath(prevPath => {
                const existingIndex = prevPath.findIndex(f => f.id === folderId);
                if (existingIndex !== -1) {
                    return prevPath.slice(0, existingIndex + 1); // Navigate up
                } else {
                    return [...prevPath, { id: folderId, name: folderName }]; // Navigate down
                }
            });
        }
        // Fetch items for the new folder
        fetchItems(folderId);
    }, [fetchItems]); // Depends on fetchItems

    // --- Effects ---
    // Initial Authentication Check
    useEffect(() => {
        const checkAuth = async () => {
            setIsAuthenticating(true); // Start auth check
            try {
                // Use profile endpoint or similar GET request that requires auth
                const res = await axios.get(`${API_BASE_URL}/api/user/profile`, { withCredentials: true }); // ADJUST URL IF NEEDED
                setUser(res.data); // Set user if session is valid
                console.log("User session restored:", res.data)
            } catch (err) {
                console.log("No active session or failed to get profile.", err.message);
                setUser(null); // Ensure user is null if auth check fails
            } finally {
                setIsAuthenticating(false); // Finish auth check
            }
        };
        checkAuth();
    }, []); // Run only once on component mount

    // Fetch items when user logs in or folder changes (triggered by navigateToFolder)
    // NOTE: We call fetchItems *directly* within navigateToFolder now,
    // so this effect only handles the *initial* fetch after login/auth restoration.
    useEffect(() => {
        if (user && !isLoading && !isAuthenticating) { // Only fetch if user exists, not loading, and auth check complete
             // Check if we need to fetch initial root items
             if(currentFolderId === null && items.length === 0) { // Example condition: fetch root only if not already loaded
                 console.log("User logged in or restored, fetching initial root items.");
                 fetchItems(null);
             }
        } else if (!user) {
            setItems([]); // Clear items on logout
            setBreadcrumbPath([{ id: null, name: 'Root' }]); // Reset breadcrumbs
            setCurrentFolderId(null); // Reset current folder
        }
    }, [user, isAuthenticating]); // Rerun when user or auth status changes

    // --- Auth Handlers ---
    const handleAuth = async (event) => {
        event.preventDefault(); // Prevent default form submission
        setIsLoading(true);
        try {
            const url = isLogin ? '/api/user/login' : '/api/user/register';
            const payload = isLogin ? { email, password } : { name, email, password };
            const res = await axios.post(`${API_BASE_URL}${url}`, payload, { withCredentials: true });

            // Adjust based on YOUR backend response structure for login/register
            const userData = res.data?.data?.user || res.data?.user || res.data;
            if (!userData || !userData.id) { // Basic check for valid user data
                throw new Error("Invalid user data received from server.");
            }

            setUser(userData);
            toast.success(isLogin ? 'Login successful!' : 'Registration successful!');
            // Clear form fields after successful auth
            setEmail('');
            setPassword('');
            setName('');
            // navigateToFolder(null, 'Root') will be triggered by the useEffect watching `user`
        } catch (err) {
            toast.error(err.response?.data?.message || 'Authentication failed');
            console.error('Auth error:', err.response?.data || err.message || err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = useCallback(async (showToast = true) => {
        console.log("Logging out...");
        try {
            await axios.post(`${API_BASE_URL}/api/user/logout`, {}, { withCredentials: true });
            if (showToast) toast.success("Logged out successfully!");
        } catch (err) {
            console.error('Logout API error:', err.response?.data || err.message || err);
            // Optionally show a toast even if API fails, as user is logged out client-side
            if (showToast) toast.error("Logout failed on server, logged out locally.");
        } finally {
            setUser(null); // Clear user state (triggers cleanup useEffect)
        }
    }, [API_BASE_URL]); // Include dependencies if needed


    // --- File/Folder Action Handlers ---
    const handleFileUpload = async () => {
        if (!fileToUpload) return toast.warn("Please select a file.");
        if (isLoading) return; // Prevent concurrent actions

        const targetFolderId = currentFolderId; // Use the current folder
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('folderId', targetFolderId); // Send null if root

        setIsLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/files/upload`, formData, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(`File '${fileToUpload.name}' uploaded.`);
            setFileToUpload(null);
            if(document.getElementById('file-upload-input')) document.getElementById('file-upload-input').value = null; // Reset input visually
            fetchItems(targetFolderIdnull); // Refetch current folder
        } catch (err) {
            toast.error(err.response?.data?.message || 'File upload failed.');
            console.error('Upload error:', err.response?.data || err.message || err);
            setIsLoading(false); // Reset loading on error
        }
    };

    const createFolder = async (event) => {
        event.preventDefault(); // Prevent default form submission if wrapped in form
        if (!folderName.trim()) return toast.warn("Folder name cannot be empty.");
        if (isLoading) return;

        const targetParentId = currentFolderId; // Create inside current folder
        setIsLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/folders`,
                { name: folderName.trim(), parentId: targetParentId },
                { withCredentials: true }
            );
            toast.success(`Folder '${folderName.trim()}' created.`);
            setFolderName('');
            fetchItems(targetParentId); // Refetch current folder
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create folder.');
            console.error('Create folder error:', err.response?.data || err.message || err);
            setIsLoading(false); // Reset loading on error
        }
    };

    const handleDelete = async (item) => {
        if (isLoading) return;
        const isFolder = item.type === 'folder';
        const endpoint = isFolder ? 'folders' : 'files';
        const itemTypeName = isFolder ? 'Folder' : 'File';
        const confirmationMessage = isFolder
            ? `DELETE FOLDER?\n\nAre you sure you want to delete the folder "${item.name}" and ALL its contents? This cannot be undone.`
            : `DELETE FILE?\n\nAre you sure you want to delete the file "${item.name}"?`;

        if (window.confirm(confirmationMessage)) {
            const folderToRefetch = currentFolderId;
            setIsLoading(true);
            try {
                await axios.delete(`${API_BASE_URL}/api/${endpoint}/${item.id}`, { withCredentials: true });
                toast.success(`${itemTypeName} '${item.name}' deleted.`);
                fetchItems(folderToRefetch); // Refetch current folder
            } catch (err) {
                toast.error(err.response?.data?.message || `Failed to delete ${itemTypeName}.`);
                console.error('Delete error:', err.response?.data || err.message || err);
                setIsLoading(false); // Reset loading on error
            }
        }
    };

    // --- Update File Logic ---
    const triggerUpdateFile = (fileId) => {
         if (isLoading) return;
        fileToUpdateIdRef.current = fileId;
        if (!updateFileInputRef.current) {
            updateFileInputRef.current = createFileInput(handleActualFileUpdate);
        } else {
            updateFileInputRef.current.value = null;
        }
        updateFileInputRef.current.click();
    };

    const handleActualFileUpdate = async (event) => {
        const newFile = event.target.files[0];
        const fileIdToUpdate = fileToUpdateIdRef.current;
        if (!newFile || !fileIdToUpdate) return cleanupFileInput();
        if (!window.confirm(`Replace the existing file with "${newFile.name}"?`)) return cleanupFileInput();

        const folderToRefetch = currentFolderId;
        const formData = new FormData();
        formData.append('file', newFile);
        setIsLoading(true);
        try {
            const res = await axios.put(`${API_BASE_URL}/api/files/${fileIdToUpdate}`, formData, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(res.data?.message || 'File updated successfully!');
            fetchItems(folderToRefetch); // Refetch current folder
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update file.');
            console.error('Update error:', err.response?.data || err.message || err);
            setIsLoading(false); // Reset loading on error
        } finally {
            cleanupFileInput();
            fileToUpdateIdRef.current = null;
        }
    };

    // Helper to remove the hidden input from the DOM
    const cleanupFileInput = () => {
        if (updateFileInputRef.current) {
            document.body.removeChild(updateFileInputRef.current);
            updateFileInputRef.current = null;
        }
    };

    // --- Download File ---
    const downloadFile = async (fileId, fileName) => { // Accept fileName for better UX on error
         if (isLoading) return;
        const downloadUrl = `${API_BASE_URL}/api/files/download/${fileId}`;
        toast.info(`Preparing download for ${fileName}...`);
        try {
            const response = await axios.get(downloadUrl, { responseType: 'blob', withCredentials: true });
            const contentDisposition = response.headers['content-disposition'];
            let effectiveFilename = fileName; // Use provided name as fallback

            if (contentDisposition) {
                const filenameRegex = /filename[^;=\n]*=(?:(['"])(?<f1>.*?)\1|(?<f2>[^;\n]*))/; // Handles quotes
                const matches = filenameRegex.exec(contentDisposition);
                if (matches?.groups) {
                     effectiveFilename = matches.groups.f1 || matches.groups.f2 || fileName;
                 }
            }

            const url = window.URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', effectiveFilename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success(`Downloading ${effectiveFilename}...`);
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to download ${fileName}.`);
            console.error('Download error:', err.response || err.message || err);
        }
    };


    // --- Render Logic ---

    // Display loading screen during initial auth check
    if (isAuthenticating) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <p className="text-gray-500 text-lg">Loading Application...</p>
                 {/* Optional: Add a spinner */}
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans text-gray-800">
            {/* --- Auth Form (Rendered when user is null) --- */}
            {!user ? (
                <div key="auth-form" className="space-y-4 bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 max-w-md mx-auto">
                    <h1 className="text-center text-2xl font-bold mb-6 text-gray-700">{isLogin ? 'Login' : 'Register'}</h1>
                    <form onSubmit={handleAuth}> {/* Use onSubmit for form */}
                        {!isLogin && (
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name_auth">Name</label>
                                <input id="name_auth" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" required={!isLogin}
                                    className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                        )}
                        <div className="mb-4">
                             <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email_auth">Email</label>
                             <input id="email_auth" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your.email@example.com" required
                                 className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                         <div className="mb-6">
                             <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password_auth">Password</label>
                             <input id="password_auth" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="******************" required
                                 className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                         <div className="flex items-center justify-between">
                            <button type="submit" disabled={isLoading}
                                className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Register')}
                            </button>
                             <button type="button" onClick={() => setIsLogin(!isLogin)} disabled={isLoading}
                                 className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800 disabled:opacity-50">
                                 {isLogin ? 'Need an account?' : 'Already registered?'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                 // --- Logged In View (Rendered when user exists) ---
                <div key="logged-in-view" className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-wrap justify-between items-center border-b pb-4 gap-4">
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Drive Clone</h1>
                        <div className="flex items-center gap-4">
                             <span className="text-sm text-gray-600 hidden sm:inline">Welcome, {user.name || 'User'}!</span>
                             <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-3 rounded focus:outline-none focus:shadow-outline text-sm" onClick={() => handleLogout()}>Logout</button>
                        </div>
                    </div>

                     {/* Action Sections */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {/* File Upload */}
                        <div className="p-4 border rounded shadow-sm bg-white">
                            <h2 className="text-lg font-semibold mb-3 text-gray-700">Upload New File</h2>
                            <div className="flex items-center space-x-3">
                                <input id="file-upload-input" type="file" onChange={e => setFileToUpload(e.target.files[0])} disabled={isLoading}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"/>
                                <button onClick={handleFileUpload} disabled={isLoading || !fileToUpload}
                                    className={`bg-green-500 hover:bg-green-700 text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed`}>
                                    Upload
                                </button>
                            </div>
                        </div>
                         {/* Create Folder */}
                        <div className="p-4 border rounded shadow-sm bg-white">
                             <h2 className="text-lg font-semibold mb-3 text-gray-700">Create New Folder</h2>
                             <form onSubmit={createFolder} className="flex items-center space-x-3"> {/* Use form for Enter key submission */}
                                 <input type="text" value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="New Folder Name" disabled={isLoading} required
                                     className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50"/>
                                 <button type="submit" disabled={isLoading || !folderName.trim()}
                                      className={`bg-purple-500 hover:bg-purple-700 text-white px-4 py-2 rounded font-bold whitespace-nowrap text-sm disabled:opacity-50 disabled:cursor-not-allowed`}>
                                     Create
                                 </button>
                            </form>
                        </div>
                    </div>

                     {/* Breadcrumbs */}
                     <Breadcrumbs path={breadcrumbPath} onNavigate={navigateToFolder} isLoading={isLoading}/>

                    {/* Files and Folders List */}
                    <div className="mt-2">
                         <h2 className="text-xl font-semibold mb-4 text-gray-800">
                             Contents {isLoading && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}
                         </h2>
                         <div className={`overflow-x-auto shadow-md rounded-lg border bg-white relative ${isLoading && items.length > 0 ? 'opacity-60' : ''}`}>
                             {/* Optional: Overlay loading spinner */}
                             {isLoading && items.length === 0 && <div className="text-center py-10 text-gray-500">Loading items...</div>}

                             <table className="w-full text-sm text-left text-gray-500">
                                 <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                     <tr>
                                         <th scope="col" className="px-4 sm:px-6 py-3 w-2/5 sm:w-1/2">Name</th>
                                         <th scope="col" className="px-4 sm:px-6 py-3 hidden md:table-cell">Type</th>
                                         <th scope="col" className="px-4 sm:px-6 py-3 hidden sm:table-cell">Size</th>
                                         <th scope="col" className="px-4 sm:px-6 py-3 text-right">Actions</th>
                                     </tr>
                                 </thead>
                                 {/* Render table body only if not initial loading */}
                                 { (!isLoading || items.length > 0) && (
                                     <tbody>
                                         {items.length > 0 ? items.map((item) => (
                                             <tr key={`${item.type}-${item.id}`} className="bg-white border-b hover:bg-gray-50 align-middle">
                                                 {/* Name & Icon */}
                                                 <td className="px-4 sm:px-6 py-3 font-medium text-gray-900 whitespace-nowrap flex items-center max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
                                                     <span className="mr-2 text-lg flex-shrink-0">{item.type === 'folder' ? '📁' : '📄'}</span>
                                                     {item.type === 'folder' ? (
                                                         <button onClick={() => navigateToFolder(item.id, item.name)} className="text-blue-600 hover:underline font-semibold text-left truncate" title={item.name}>
                                                             {item.name}
                                                         </button>
                                                     ) : (
                                                         <span className="truncate" title={item.name}>{item.name}</span>
                                                     )}
                                                 </td>
                                                 {/* Type */}
                                                 <td className="px-4 sm:px-6 py-3 hidden md:table-cell">
                                                     {item.type === 'folder' ? 'Folder' : (item.type || 'File')}
                                                 </td>
                                                 {/* Size */}
                                                 <td className="px-4 sm:px-6 py-3 hidden sm:table-cell">
                                                     {item.type === 'file' && item.size != null ? formatBytes(item.size) : '-'}
                                                 </td>
                                                 {/* Actions */}
                                                 <td className="px-4 sm:px-6 py-3 text-right space-x-2 whitespace-nowrap">
                                                     {item.type === 'file' && (
                                                         <> {/* Use Fragment for multiple buttons */}
                                                             <button onClick={() => triggerUpdateFile(item.id)} disabled={isLoading} className="font-medium text-yellow-600 hover:text-yellow-800 hover:underline disabled:opacity-50 disabled:no-underline" title="Replace File Content">Update</button>
                                                             <button onClick={() => downloadFile(item.id, item.name)} disabled={isLoading} className="font-medium text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50 disabled:no-underline" title="Download File">Download</button>
                                                         </>
                                                     )}
                                                     <button onClick={() => handleDelete(item)} disabled={isLoading} className="font-medium text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 disabled:no-underline" title={`Delete ${item.type}`}>Delete</button>
                                                 </td>
                                             </tr>
                                         )) : (
                                              // Only show "empty" message if not loading
                                             !isLoading && (
                                                 <tr>
                                                     <td colSpan="4" className="text-center py-6 px-6 text-gray-500 italic">This folder is empty.</td>
                                                 </tr>
                                             )
                                         )}
                                     </tbody>
                                  )}
                             </table>
                         </div>
                    </div>
                </div>
            )}
            {/* Toast notifications container */}
            <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />
        </div>
    );
}