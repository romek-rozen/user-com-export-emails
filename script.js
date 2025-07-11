let allUsers = [];
let totalUsers = 0;
let fetchedUsers = 0;
let currentPage = 1;
let usersPerPage = 100;
let selectedFields = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

function initializeEventListeners() {
    document.getElementById('selectAll').addEventListener('click', function() {
        const checkboxes = document.querySelectorAll('input[name="fields"]');
        checkboxes.forEach(checkbox => checkbox.checked = true);
    });

    document.getElementById('selectNone').addEventListener('click', function() {
        const checkboxes = document.querySelectorAll('input[name="fields"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);
    });

    document.getElementById('viewUsers').addEventListener('click', async function() {
        const appSubdomain = document.getElementById('appSubdomain').value.trim();
        const token = document.getElementById('token').value.trim();
        selectedFields = Array.from(document.querySelectorAll('input[name="fields"]:checked'))
            .map(checkbox => checkbox.value);
        
        if (!appSubdomain || !token) {
            showStatus('Please fill in all fields', 'error');
            return;
        }
        
        if (selectedFields.length === 0) {
            showStatus('Please select at least one field to display', 'error');
            return;
        }
        
        const subdomain = appSubdomain.replace(/^https?:\/\//, '').replace(/\.user\.com.*$/, '');
        
        try {
            await fetchAllUsersForDisplay(subdomain, token);
        } catch (error) {
            console.error('Error fetching users:', error);
            showStatus('Error fetching users: ' + error.message, 'error');
            hideProgress();
        }
    });

    document.getElementById('exportForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const appSubdomain = document.getElementById('appSubdomain').value.trim();
        const token = document.getElementById('token').value.trim();
        const selectedFields = Array.from(document.querySelectorAll('input[name="fields"]:checked'))
            .map(checkbox => checkbox.value);
        
        if (!appSubdomain || !token) {
            showStatus('Please fill in all fields', 'error');
            return;
        }
        
        if (selectedFields.length === 0) {
            showStatus('Please select at least one field to export', 'error');
            return;
        }
        
        const subdomain = appSubdomain.replace(/^https?:\/\//, '').replace(/\.user\.com.*$/, '');
        
        try {
            await fetchAllUsers(subdomain, token, selectedFields);
        } catch (error) {
            showStatus('Error fetching users: ' + error.message, 'error');
            hideProgress();
        }
    });
}

async function fetchAllUsers(subdomain, token, selectedFields) {
    showProgress();
    showStatus('Fetching users...', 'info');
    
    allUsers = [];
    fetchedUsers = 0;
    totalUsers = 0;
    
    let cursor = null;
    let hasMore = true;
    
    while (hasMore) {
        try {
            const params = new URLSearchParams({
                subdomain: subdomain,
                token: token,
                with_email: 'true'
            });
            
            if (cursor) {
                params.append('cursor', cursor);
            }
            
            const response = await fetch(`/api/users?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (totalUsers === 0) {
                totalUsers = data.count;
            }
            
            allUsers = allUsers.concat(data.results);
            fetchedUsers = allUsers.length;
            
            updateProgress(fetchedUsers, totalUsers);
            
            // Extract cursor from next URL if it exists
            if (data.next) {
                const nextUrl = new URL(data.next);
                cursor = nextUrl.searchParams.get('cursor');
                hasMore = true;
            } else {
                hasMore = false;
            }
            
            if (hasMore) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
        } catch (error) {
            throw new Error(`API Error: ${error.message}`);
        }
    }
    
    hideProgress();
    generateCSV(allUsers, selectedFields);
}

async function fetchAllUsersForDisplay(subdomain, token) {
    showProgress();
    showStatus('Fetching users...', 'info');
    
    allUsers = [];
    fetchedUsers = 0;
    totalUsers = 0;
    
    let cursor = null;
    let hasMore = true;
    
    while (hasMore) {
        try {
            const params = new URLSearchParams({
                subdomain: subdomain,
                token: token,
                with_email: 'true'
            });
            
            if (cursor) {
                params.append('cursor', cursor);
            }
            
            const response = await fetch(`/api/users?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (totalUsers === 0) {
                totalUsers = data.count;
            }
            
            allUsers = allUsers.concat(data.results);
            fetchedUsers = allUsers.length;
            
            updateProgress(fetchedUsers, totalUsers);
            
            // Extract cursor from next URL if it exists
            if (data.next) {
                const nextUrl = new URL(data.next);
                cursor = nextUrl.searchParams.get('cursor');
                hasMore = true;
            } else {
                hasMore = false;
            }
            
            if (hasMore) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
        } catch (error) {
            throw new Error(`API Error: ${error.message}`);
        }
    }
    
    hideProgress();
    showStatus(`Fetched ${allUsers.length} users`, 'success');
    displayUsersTable();
}

function displayUsersTable() {
    console.log('displayUsersTable called with', allUsers.length, 'users');
    const usersTable = document.getElementById('usersTable');
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    
    if (!usersTable || !tableHead || !tableBody) {
        console.error('Missing table elements');
        return;
    }
    
    usersTable.style.display = 'block';
    
    const fieldLabels = {
        'email': 'Email',
        'name': 'Name',
        'id': 'ID',
        'key': 'Key',
        'created_at': 'Created Date',
        'updated_at': 'Updated Date',
        'status': 'Status',
        'unsubscribed': 'Unsubscribed',
        'phone_number': 'Phone',
        'country': 'Country',
        'city': 'City',
        'gender': 'Gender',
        'score': 'Score',
        'page_views': 'Page Views',
        'first_seen': 'First Seen',
        'last_seen': 'Last Seen',
        'last_contacted': 'Last Contacted',
        'tags': 'Tags',
        'attributes': 'Attributes',
        'companies': 'Companies'
    };
    
    const headers = selectedFields.map(field => fieldLabels[field] || field);
    tableHead.innerHTML = '<tr>' + headers.map(header => `<th>${header}</th>`).join('') + '</tr>';
    
    currentPage = 1;
    displayPage();
    createPagination();
}

function displayPage() {
    const tableBody = document.getElementById('tableBody');
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const pageUsers = allUsers.slice(startIndex, endIndex);
    
    tableBody.innerHTML = '';
    
    pageUsers.forEach(user => {
        const row = document.createElement('tr');
        selectedFields.forEach(field => {
            const cell = document.createElement('td');
            let value = user[field];
            
            if (field === 'tags') {
                value = user.tags ? user.tags.map(tag => tag.name || tag).join(', ') : '';
            } else if (field === 'attributes') {
                value = user.attributes ? user.attributes.map(attr => `${attr.name}: ${attr.value}`).join(', ') : '';
            } else if (field === 'companies') {
                value = user.companies ? user.companies.map(company => company.name).join(', ') : '';
            } else if (field === 'unsubscribed') {
                value = value ? 'Yes' : 'No';
            } else if (field === 'created_at' || field === 'updated_at' || field === 'first_seen' || field === 'last_seen' || field === 'last_contacted') {
                if (value) {
                    value = new Date(value).toLocaleDateString('pl-PL');
                }
            }
            
            if (value === null || value === undefined) {
                value = '';
            }
            
            cell.textContent = value;
            row.appendChild(cell);
        });
        tableBody.appendChild(row);
    });
}

function createPagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(allUsers.length / usersPerPage);
    
    pagination.innerHTML = '';
    
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Previous';
    prevBtn.className = 'btn-secondary';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayPage();
            createPagination();
        }
    });
    pagination.appendChild(prevBtn);
    
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${allUsers.length} users)`;
    pagination.appendChild(pageInfo);
    
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
    nextBtn.className = 'btn-secondary';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayPage();
            createPagination();
        }
    });
    pagination.appendChild(nextBtn);
}

function generateCSV(users, selectedFields) {
    showStatus('Generating CSV file...', 'info');
    
    const headers = selectedFields.map(field => {
        const fieldLabels = {
            'email': 'Email',
            'name': 'Name',
            'id': 'ID',
            'key': 'Key',
            'created_at': 'Created Date',
            'updated_at': 'Updated Date',
            'status': 'Status',
            'unsubscribed': 'Unsubscribed',
            'phone_number': 'Phone',
            'country': 'Country',
            'city': 'City',
            'gender': 'Gender',
            'score': 'Score',
            'page_views': 'Page Views',
            'first_seen': 'First Seen',
            'last_seen': 'Last Seen',
            'last_contacted': 'Last Contacted',
            'tags': 'Tags',
            'attributes': 'Attributes',
            'companies': 'Companies'
        };
        return fieldLabels[field] || field;
    });
    
    let csvContent = headers.join(',') + '\n';
    
    users.forEach(user => {
        const row = selectedFields.map(field => {
            let value = user[field];
            
            if (field === 'tags') {
                value = user.tags ? user.tags.map(tag => tag.name || tag).join('; ') : '';
            } else if (field === 'attributes') {
                value = user.attributes ? user.attributes.map(attr => `${attr.name}: ${attr.value}`).join('; ') : '';
            } else if (field === 'companies') {
                value = user.companies ? user.companies.map(company => company.name).join('; ') : '';
            } else if (field === 'unsubscribed') {
                value = value ? 'Yes' : 'No';
            }
            
            if (value === null || value === undefined) {
                value = '';
            }
            
            value = String(value).replace(/"/g, '""');
            
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = `"${value}"`;
            }
            
            return value;
        });
        
        csvContent += row.join(',') + '\n';
    });
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const filename = `user_list_${year}_${month}_${day}.csv`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    showStatus(`Successfully exported ${users.length} users to file ${filename}`, 'success');
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
}

function showProgress() {
    document.getElementById('progress').style.display = 'block';
}

function hideProgress() {
    document.getElementById('progress').style.display = 'none';
}

function updateProgress(current, total) {
    const percentage = (current / total) * 100;
    document.getElementById('progressFill').style.width = percentage + '%';
    document.getElementById('progressText').textContent = `Fetched ${current} of ${total} users (${Math.round(percentage)}%)`;
}