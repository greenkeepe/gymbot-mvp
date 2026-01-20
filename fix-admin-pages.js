// Quick fix script to add Supabase init to all admin pages
// This adds the necessary script tags and initSupabase() calls

const fs = require('fs');
const path = require('path');

const files = [
    'public/admin/staff.html',
    'public/admin/pricing.html',
    'public/admin/courses.html'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Add script tags if not present
    if (!content.includes('supabase-init.js')) {
        content = content.replace(
            /<script>/,
            '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n    <script src="/admin/supabase-init.js"></script>\n    <script>'
        );
    }

    // Add initSupabase() to loadPeople function
    content = content.replace(
        /async function loadPeople\(\) \{\s*const \{ data: gym \} = await sb/,
        'async function loadPeople() {\n            const sb = await initSupabase();\n            if (!sb) return;\n            const { data: gym } = await sb'
    );

    // Add initSupabase() to loadPricing function
    content = content.replace(
        /async function loadPricing\(\) \{\s*const \{ data: gym \} = await sb/,
        'async function loadPricing() {\n            const sb = await initSupabase();\n            if (!sb) return;\n            const { data: gym } = await sb'
    );

    // Add initSupabase() to loadCourses function  
    content = content.replace(
        /async function loadCourses\(\) \{\s*const \{ data: gym \} = await sb/,
        'async function loadCourses() {\n            const sb = await initSupabase();\n            if (!sb) return;\n            const { data: gym } = await sb'
    );

    // Add initSupabase() to savePricing function
    content = content.replace(
        /async function savePricing\(\) \{\s*const pricing/,
        'async function savePricing() {\n            const sb = await initSupabase();\n            if (!sb) return;\n            const pricing'
    );

    // Add initSupabase() to form submit handlers
    content = content.replace(
        /(addEventListener\('submit', async \(e\) => \{\s*e\.preventDefault\(\);)\s*const type/,
        '$1\n            const sb = await initSupabase();\n            if (!sb) return;\n            const type'
    );

    content = content.replace(
        /(addEventListener\('submit', async \(e\) => \{\s*e\.preventDefault\(\);)\s*const \{ data: gym \}/,
        '$1\n            const sb = await initSupabase();\n            if (!sb) return;\n            const { data: gym }'
    );

    fs.writeFileSync(file, content);
    console.log(`✓ Fixed ${file}`);
});

console.log('\nAll files updated!');
