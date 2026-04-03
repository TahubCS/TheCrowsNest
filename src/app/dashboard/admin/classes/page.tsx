"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

// ========================================================
// DEPARTMENTS — Add or remove departments here as needed.
// Each entry appears as a dropdown option in the admin
// class creation form.
// ========================================================
const DEPARTMENTS = [
  "Accounting",
  "Anthropology",
  "Art and Design",
  "Biology",
  "Chemistry",
  "Communication",
  "Computer Science",
  "Criminal Justice",
  "Economics",
  "Education",
  "Engineering",
  "English",
  "Environmental Science",
  "Geography",
  "Geology",
  "Health Education",
  "History",
  "Interior Design",
  "Kinesiology",
  "Management",
  "Marketing",
  "Mathematics",
  "Music",
  "Nursing",
  "Nutrition Science",
  "Philosophy",
  "Physics",
  "Political Science",
  "Psychology",
  "Public Health",
  "Social Work",
  "Sociology",
  "Theatre",
  // -------------------------------------------------------
  // Add more departments below this line:
  // -------------------------------------------------------
];

interface CourseClass {
  classId: string;
  courseCode: string;
  courseName: string;
  department: string;
  creditHours: number;
  description: string;
  enrolledCount: number;
  syllabus?: string;
}

export default function AdminClassesPage() {
  const searchParams = useSearchParams();
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showSyllabus, setShowSyllabus] = useState(false);
  const [search, setSearch] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  // Form state
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [creditHours, setCreditHours] = useState(3);
  const [description, setDescription] = useState("");
  const [syllabus, setSyllabus] = useState("");

  // Pre-fill form from URL params (when redirected from Pending Requests)
  useEffect(() => {
    const code = searchParams.get("courseCode");
    const name = searchParams.get("courseName");
    const dept = searchParams.get("department");

    if (code) setCourseCode(code);
    if (name) setCourseName(name);
    if (dept && DEPARTMENTS.includes(dept)) {
      setDepartment(dept);
    }
    if (code || name) {
      setPrefilled(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/admin/classes");
      const json = await res.json();
      if (json.success) {
        setClasses(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch classes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode,
          courseName,
          department,
          creditHours,
          description,
          ...(syllabus.trim() ? { syllabus: syllabus.trim() } : {}),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`✅ Class "${courseCode.toUpperCase()}" created successfully!`);
        // Reset form
        setCourseCode("");
        setCourseName("");
        setDepartment(DEPARTMENTS[0]);
        setCreditHours(3);
        setDescription("");
        setSyllabus("");
        setShowSyllabus(false);
        // Refresh list
        fetchClasses();
      } else {
        setErrorMsg(json.message || "Failed to create class.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Something went wrong.");
    } finally {
      setCreating(false);
    }
  };

  const filteredClasses = classes.filter(
    (c) =>
      c.courseCode.toLowerCase().includes(search.toLowerCase()) ||
      c.courseName.toLowerCase().includes(search.toLowerCase()) ||
      c.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 h-full bg-background animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* =============================================
            LEFT: Create New Class Form
            ============================================= */}
        <section className="lg:col-span-2 bg-muted/10 border border-border/50 rounded-xl shadow-sm p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 tracking-tight">
              <span>✏️</span> Create New Class
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Manually add a class to the platform.
            </p>
          </div>

          {prefilled && (
            <div className="mb-4 text-sm font-semibold text-ecu-purple bg-ecu-purple/10 border border-ecu-purple/20 rounded-lg px-4 py-2.5 animate-in fade-in duration-200 flex items-center gap-2">
              <span>⚡</span> Pre-filled from an approved class request. Review the details, add a description & syllabus if needed, then hit Create.
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            {/* Course Code */}
            <div>
              <label htmlFor="courseCode" className="block text-sm font-semibold mb-1.5">
                Course Code <span className="text-red-500">*</span>
              </label>
              <input
                id="courseCode"
                type="text"
                placeholder="e.g. CSCI 2540"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                required
                className="w-full text-sm border border-border rounded-lg p-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-ecu-purple/40 transition-shadow"
              />
            </div>

            {/* Course Name */}
            <div>
              <label htmlFor="courseName" className="block text-sm font-semibold mb-1.5">
                Course Name <span className="text-red-500">*</span>
              </label>
              <input
                id="courseName"
                type="text"
                placeholder="e.g. Data Abstraction"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                required
                className="w-full text-sm border border-border rounded-lg p-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-ecu-purple/40 transition-shadow"
              />
            </div>

            {/* Department Dropdown */}
            <div>
              <label htmlFor="department" className="block text-sm font-semibold mb-1.5">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                className="w-full text-sm border border-border rounded-lg p-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-ecu-purple/40 transition-shadow"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Credit Hours */}
            <div>
              <label htmlFor="creditHours" className="block text-sm font-semibold mb-1.5">
                Credit Hours
              </label>
              <div className="flex items-center border border-border rounded-lg bg-background focus-within:ring-2 focus-within:ring-ecu-purple/40 transition-shadow">
                <button
                  type="button"
                  onClick={() => setCreditHours(Math.max(1, creditHours - 1))}
                  className="px-3 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-l-lg transition-colors"
                >
                  −
                </button>
                <input
                  id="creditHours"
                  type="number"
                  min={1}
                  max={6}
                  value={creditHours}
                  onChange={(e) => setCreditHours(Math.min(6, Math.max(1, Number(e.target.value))))}
                  className="flex-1 text-sm text-center p-2.5 bg-transparent focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
                <button
                  type="button"
                  onClick={() => setCreditHours(Math.min(6, creditHours + 1))}
                  className="px-3 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-r-lg transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-semibold mb-1.5">
                Description
              </label>
              <textarea
                id="description"
                rows={2}
                placeholder="Short course description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm border border-border rounded-lg p-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-ecu-purple/40 transition-shadow resize-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/60 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-border"
              />
            </div>

            {/* Syllabus Toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowSyllabus(!showSyllabus)}
                className="flex items-center gap-2 text-sm font-semibold text-ecu-purple hover:text-ecu-purple/80 transition-colors cursor-pointer"
              >
                <span>{showSyllabus ? "▼" : "▶"}</span>
                📋 {showSyllabus ? "Hide Syllabus" : "Add Syllabus"}
              </button>

              {showSyllabus && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <textarea
                    id="syllabus"
                    rows={6}
                    placeholder="Paste syllabus text here, or describe the class structure, key topics, and purpose. This context helps our AI validate uploaded materials..."
                    value={syllabus}
                    onChange={(e) => setSyllabus(e.target.value)}
                    className="w-full text-sm border border-ecu-purple/30 rounded-lg p-2.5 bg-ecu-purple/5 focus:outline-none focus:ring-2 focus:ring-ecu-purple/40 transition-shadow resize-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/60 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-border"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    💡 This information is stored with the class and can be used by the AI to verify uploaded materials are relevant.
                  </p>
                </div>
              )}
            </div>

            {/* Feedback messages */}
            {successMsg && (
              <div className="text-sm font-semibold text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 animate-in fade-in duration-200">
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 animate-in fade-in duration-200">
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={creating}
              className="w-full py-2.5 rounded-lg font-bold text-white bg-ecu-purple hover:bg-ecu-purple/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {creating ? "Creating..." : "Create Class"}
            </button>
          </form>
        </section>

        {/* =============================================
            RIGHT: Existing Classes Table
            ============================================= */}
        <section className="lg:col-span-3 bg-muted/10 border border-border/50 rounded-xl shadow-sm p-6">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 tracking-tight">
                <span>📚</span> Existing Classes
              </h2>
              <p className="text-muted-foreground text-xs mt-1">
                {classes.length} class{classes.length !== 1 ? "es" : ""} in the database.
              </p>
            </div>
            <input
              type="text"
              placeholder="Search classes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ecu-purple/40 transition-shadow w-full sm:w-56"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground animate-pulse">
              Loading classes...
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 mt-4 bg-background border border-dashed border-border/70 rounded-lg text-center">
              <span className="text-5xl mb-4 drop-shadow-sm">📭</span>
              <h3 className="text-lg font-bold text-foreground mb-1">
                {search ? "No matching classes" : "No classes yet"}
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                {search
                  ? "Try a different search term."
                  : "Use the form on the left to create a class."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="pb-2 pr-3 font-bold text-foreground">Code</th>
                    <th className="pb-2 pr-3 font-bold text-foreground">Name</th>
                    <th className="pb-2 pr-3 font-bold text-foreground hidden md:table-cell">Dept</th>
                    <th className="pb-2 pr-3 font-bold text-foreground hidden sm:table-cell">Hrs</th>
                    <th className="pb-2 font-bold text-foreground hidden sm:table-cell">Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClasses.map((c) => (
                    <tr
                      key={c.classId}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2.5 pr-3 font-bold text-ecu-purple whitespace-nowrap">
                        {c.courseCode}
                      </td>
                      <td className="py-2.5 pr-3 text-foreground">
                        <div>{c.courseName}</div>
                        {c.syllabus && (
                          <span className="text-xs text-green-600 font-semibold">📋 Syllabus</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground hidden md:table-cell">
                        {c.department}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground hidden sm:table-cell">
                        {c.creditHours}
                      </td>
                      <td className="py-2.5 text-muted-foreground hidden sm:table-cell">
                        {c.enrolledCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
