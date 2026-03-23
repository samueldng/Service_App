import fs from 'fs';

const API_URL = 'http://localhost:3333/api';

async function run() {
    console.log('Logging in...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'qa.test.maintqr@gmail.com', password: 'TestQA2026!' })
    });
    const loginData = await loginRes.json();
    if (!loginData.token) {
        console.error('Login failed:', loginData);
        return;
    }
    const token = loginData.token;
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    console.log('Fetching clients...');
    const clientsRes = await fetch(`${API_URL}/clients`, { headers });
    const clients = await clientsRes.json();
    const client = clients[0];
    if (!client) {
        console.error('No clients found');
        return;
    }
    console.log('Found client:', client.id);

    console.log('Creating sector...');
    const sectorRes = await fetch(`${API_URL}/sectors`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Script Sector', description: 'Test', client_id: client.id })
    });
    const sector = await sectorRes.json();
    console.log('Created sector:', sector);

    console.log('Deleting sector...');
    const delSectorRes = await fetch(`${API_URL}/sectors/${sector.id}`, { method: 'DELETE', headers });
    console.log('Delete sector status:', delSectorRes.status);
    const delSectorText = await delSectorRes.text();
    console.log('Delete sector body:', delSectorText);

    console.log('Creating equipment with valid data...');
    const eqRes = await fetch(`${API_URL}/equipments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            client_id: client.id,
            sector_id: sector.id,
            name: 'Test Eq',
            brand: 'LG',
            model: 'X',
            serial_number: '123'
        })
    });
    console.log('Create equipment status:', eqRes.status);
    const eqText = await eqRes.text();
    console.log('Create equipment body:', eqText);

    // Try without client_id (like UI might be doing?)
    console.log('Creating equipment with empty client_id...');
    const eqRes2 = await fetch(`${API_URL}/equipments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            client_id: '',
            sector_id: sector.id,
            name: 'Test Eq',
            brand: 'LG',
            model: 'X',
            serial_number: '123'
        })
    });
    console.log('Create equipment (no client) status:', eqRes2.status);
    console.log('Create equipment (no client) body:', await eqRes2.text());
}

run().catch(console.error);
