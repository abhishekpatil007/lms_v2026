import xlsx from 'xlsx';

const ws = xlsx.utils.json_to_sheet([
    {
        name: "John Doe",
        email: "student@example.com",
        preferred_language: "English",
    }
]);

const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Template");

// Adjust column widths
ws['!cols'] = [
    { wch: 25 }, // name
    { wch: 30 }, // email
    { wch: 20 }, // preferred_language
];

xlsx.writeFile(wb, "../frontend/public/students-template.xlsx");
