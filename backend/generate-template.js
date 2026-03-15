import xlsx from 'xlsx';

const ws = xlsx.utils.json_to_sheet([
    {
        email: "student@example.com",
        fullName: "John Doe",
        courseName: "Web Development",
        batchName: "Batch A",
        amount: 5000
    }
]);

const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Template");

// Adjust column widths
ws['!cols'] = [
    { wch: 25 }, // email
    { wch: 20 }, // fullName
    { wch: 20 }, // courseName
    { wch: 15 }, // batchName
    { wch: 10 }  // amount
];

xlsx.writeFile(wb, "../frontend/public/invoice-template.xlsx");
