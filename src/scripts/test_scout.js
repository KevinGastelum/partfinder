import handler from '../../api/scout.js';

// Mock Request and Response
const req = {
    query: { q: '2015 Ford F-150 Brake Pads' }
};

const res = {
    status: (code) => ({
        json: (data) => {
            console.log(`\n🔹 Status Code: ${code}`);
            console.log("🔹 Response Data:");
            console.dir(data, { depth: null });
            return data;
        }
    })
};

console.log("🚀 Running Scout Test...");
handler(req, res).then(() => console.log("\n✅ Test Complete"));
