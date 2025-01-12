import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { saveAs } from 'file-saver'; // Import FileSaver.js

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const FileUpload = () => {
  const [files, setFiles] = useState([]);
  const [fileCounts, setFileCounts] = useState({ pdf: 0, word: 0, excel: 0, others: 0 });
  const [filteredCounts, setFilteredCounts] = useState({ pdf: 0, word: 0, excel: 0, others: 0 });
  const [filters, setFilters] = useState({ fileType: '', fileSize: '', fileSizeUnit: 'KB', lastModified: '' });
  const [showPopup, setShowPopup] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false); // To track if filters are applied

  const handleFileChange = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    setFiles(uploadedFiles);
    const counts = getFileCounts(uploadedFiles);
    setFileCounts(counts);
    setFilteredCounts(counts); // Initialize filteredCounts to match fileCounts

    // Automatically process files when they are uploaded
    handleUpload(uploadedFiles);
  };

  const handleRemoveAll = () => {
    setFiles([]);
    setFileCounts({ pdf: 0, word: 0, excel: 0, others: 0 });
    setFilteredCounts({ pdf: 0, word: 0, excel: 0, others: 0 });
  };

  const handleViewDetails = () => {
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  const getFileCounts = (fileList) => {
    const counts = { pdf: 0, word: 0, excel: 0, others: 0 };
    fileList.forEach((file) => {
      const fileType = file.name.split('.').pop().toLowerCase();
      if (fileType === 'pdf') {
        counts.pdf += 1;
      } else if (['doc', 'docx'].includes(fileType)) {
        counts.word += 1;
      } else if (['xls', 'xlsx', 'xml'].includes(fileType)) {
        counts.excel += 1;
      } else {
        counts.others += 1;
      }
    });
    return counts;
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleApplyFilters = () => {
    const { fileType, fileSize, fileSizeUnit, lastModified } = filters;

    // Convert file size to bytes for comparison
    const sizeLimit =
      fileSize && fileSizeUnit
        ? parseFloat(fileSize) *
          (fileSizeUnit === 'KB' ? 1024 : fileSizeUnit === 'MB' ? 1024 * 1024 : 1024 * 1024 * 1024)
        : null;

    // Convert last modified date to timestamp for comparison
    const modifiedDate = lastModified ? new Date(lastModified).getTime() : null;

    const filteredFiles = files.filter((file) => {
      const fileExt = file.name.split('.').pop().toLowerCase();
      const fileTypeMatch = fileType
        ? (fileType === 'pdf' && fileExt === 'pdf') ||
          (fileType === 'word' && ['doc', 'docx'].includes(fileExt)) ||
          (fileType === 'excel' && ['xls', 'xlsx'].includes(fileExt)) ||
          (fileType === 'others' && !['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(fileExt))
        : true;

      const fileSizeMatch = sizeLimit ? file.size <= sizeLimit : true;
      const lastModifiedMatch = modifiedDate ? file.lastModified >= modifiedDate : true;

      return fileTypeMatch && fileSizeMatch && lastModifiedMatch;
    });

    const counts = getFileCounts(filteredFiles);
    setFilteredCounts(counts);
    setFiltersApplied(true); // Set the flag to indicate filters are applied
  };

  const handleClearFilters = () => {
    setFilters({ fileType: '', fileSize: '', fileSizeUnit: 'KB', lastModified: '' });
    setFilteredCounts(fileCounts); // Reset to original counts
    setFiltersApplied(false); // Reset the flag since filters are cleared
  };

  const chartData = {
    labels: ['PDF', 'Word', 'Excel', 'Others'],
    datasets: [
      {
        label: 'File Counts',
        data: [
          filteredCounts.pdf,
          filteredCounts.word,
          filteredCounts.excel,
          filteredCounts.others,
        ],
        backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0'],
        borderColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0'],
        borderWidth: 1,
      },
    ],
  };

  const handleUpload = async (uploadedFiles) => {
    const formData = new FormData();
    uploadedFiles.forEach((file) => formData.append('files', file));

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Files uploaded and converted to CSV successfully!');
      } else {
        alert('Failed to upload and process files.');
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    }
  };

  // Updated function for export all
  const handleConvertAllToCSV = async () => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
  
    try {
      const response = await fetch('http://localhost:5000/convert/all', {
        method: 'POST',
        body: formData,
      });
  
      if (response.ok) {
        const data = await response.blob(); // Ensure response is processed as a Blob
        saveAs(data, 'files_export.csv');   // Save file using FileSaver.js
        alert('All files converted to CSV!');
      } else {
        alert('Failed to convert all files.');
      }
    } catch (error) {
      console.error('Error converting all files:', error);
    }
  };
  

  const handleConvertFilteredToCSV = async () => {
    const { fileType } = filters;

    // Convert only files that match the filter
    const filteredFiles = files.filter((file) => {
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (fileType === 'pdf') {
        return fileExt === 'pdf';
      } else if (fileType === 'word') {
        return ['doc', 'docx'].includes(fileExt);
      } else if (fileType === 'excel') {
        return ['xls', 'xlsx'].includes(fileExt);
      }
      return true;
    });

    if (filteredFiles.length > 0) {
      const formData = new FormData();
      filteredFiles.forEach((file) => formData.append('files', file));

      try {
        const response = await fetch('http://localhost:5000/convert/filtered', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.blob(); // Get the filtered CSV data as a Blob
          saveAs(data, 'filtered_files_export.csv'); // Trigger the download using FileSaver.js
          alert('Filtered files converted to CSV!');
        } else {
          alert('Failed to convert filtered files.');
        }
      } catch (error) {
        console.error('Error converting filtered files:', error);
      }
    } else {
      alert('No files to convert based on the applied filters.');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100vh', gap: '20px' }}>
      <div style={{ padding: '20px', borderRight: '1px solid #ccc' }}>
        <h3>File/Folder Upload</h3>
        <input
          type="file"
          multiple
          webkitdirectory="true"
          onChange={handleFileChange}
          accept=".pdf, .doc, .docx, .xls, .xlsx"
        />
        <div style={{ marginTop: '10px' }}>
          <p>
            Total Files: {files.length}
            <button onClick={handleRemoveAll} style={removeButtonStyle}>
              Remove All
            </button>
          </p>
        </div>
        <div style={{ marginTop: '20px' }}>
          <h5>Filters</h5>
          <label>File Type:</label>
          <select name="fileType" onChange={handleFilterChange} value={filters.fileType}>
            <option value="">All</option>
            <option value="pdf">PDF</option>
            <option value="word">Word</option>
            <option value="excel">Excel</option>
            <option value="others">Others</option>
          </select>
          <br />
          <label>File Size:</label>
          <input
            type="number"
            name="fileSize"
            onChange={handleFilterChange}
            value={filters.fileSize}
            placeholder="Size Limit"
          />
          <select name="fileSizeUnit" onChange={handleFilterChange} value={filters.fileSizeUnit}>
            <option value="KB">KB</option>
            <option value="MB">MB</option>
            <option value="GB">GB</option>
          </select>
          <br />
          <label>Last Modified After:</label>
          <input
            type="date"
            name="lastModified"
            onChange={handleFilterChange}
            value={filters.lastModified}
          />
          <br />
          <button onClick={handleApplyFilters} style={applyFilterButtonStyle}>
            Apply Filters
          </button>
          <button onClick={handleClearFilters} style={clearFilterButtonStyle}>
            Clear Filters
          </button>
        </div>
        <div style={{ marginTop: '20px' }}>
          <button onClick={handleConvertAllToCSV} style={convertButtonStyle}>
            Export All 
          </button>
          {filtersApplied && (
            <button onClick={handleConvertFilteredToCSV} style={convertButtonStyle}>
               Filtered file Export
            </button>
          )}
          <button onClick={handleViewDetails} style={viewDetailsButtonStyle}>
            View Details
          </button>
        </div>
      </div>
      <div style={{ padding: '20px' }}>
        <h3>File Type Distribution</h3>
        <Bar data={chartData} options={{ responsive: true, scales: { y: { beginAtZero: true } } }} />
      </div>
      {showPopup && (
        <div style={popupStyle}>
          <div style={popupInnerStyle}>
            <h3>File Details</h3>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>File Size </th>
                  <th>Last Modified</th>
                  <th>File Type</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file, index) => (
                  <tr key={index}>
                    <td>{file.name}</td>
                    <td>{(file.size / 1024).toFixed(2)}</td>
                    <td>{new Date(file.lastModified).toLocaleDateString()}</td>
                    <td>{file.name.split('.').pop().toUpperCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleClosePopup}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

// Style Constants
const removeButtonStyle = {
  marginLeft: '10px',
  backgroundColor: 'red',
  color: 'white',
  padding: '5px 10px',
  border: 'none',
  cursor: 'pointer',
};

const applyFilterButtonStyle = {
  marginTop: '10px',
  backgroundColor: 'green',
  color: 'white',
  padding: '5px 10px',
  border: 'none',
  cursor: 'pointer',
};

const clearFilterButtonStyle = {
  marginTop: '10px',
  backgroundColor: 'gray',
  color: 'white',
  padding: '5px 10px',
  border: 'none',
  cursor: 'pointer',
};

const convertButtonStyle = {
  backgroundColor: '#4caf50',
  color: 'white',
  padding: '10px 20px',
  border: 'none',
  cursor: 'pointer',
  marginTop: '20px',
};

const viewDetailsButtonStyle = {
  backgroundColor: '#2196F3',
  color: 'white',
  padding: '10px 20px',
  border: 'none',
  cursor: 'pointer',
  marginTop: '20px',
};

const popupStyle = {
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const popupInnerStyle = {
  backgroundColor: 'white',
  padding: '20px',
  borderRadius: '5px',
  width: '60%',
  overflowY: 'auto',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
};

export default FileUpload;
