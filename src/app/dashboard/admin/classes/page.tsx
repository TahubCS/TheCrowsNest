"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getMajorNames } from "@/lib/data/ecu-majors";

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
];

const DELETE_CONFIRMATION = "delete permanently";

interface CourseClass {
  classId: string;
  courseCode: string;
  courseName: string;
  department: string;
  creditHours: number;
  description: string;
  relatedMajors?: string[];
  enrolledCount: number;
  syllabus?: string;
}

interface ClassFormState {
  courseCode: string;
  courseName: string;
  department: string;
  creditHours: number;
  description: string;
  syllabus: string;
  relatedMajors: string[];
}

const emptyForm: ClassFormState = {
  courseCode: "",
  courseName: "",
  department: DEPARTMENTS[0],
  creditHours: 3,
  description: "",
  syllabus: "",
  relatedMajors: [],
};

export default function AdminClassesPage() {
  const searchParams = useSearchParams();
  const allMajors = getMajorNames();

  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedClass, setSelectedClass] = useState<CourseClass | null>(null);
  const [form, setForm] = useState<ClassFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showSyllabus, setShowSyllabus] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

  const [majorSearch, setMajorSearch] = useState("");
  const [majorDropdownOpen, setMajorDropdownOpen] = useState(false);
  const [deptSearch, setDeptSearch] = useState("");
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const majorDropdownRef = useRef<HTMLDivElement>(null);
  const deptDropdownRef = useRef<HTMLDivElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<CourseClass | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    const code = searchParams.get("courseCode");
    const name = searchParams.get("courseName");
    const dept = searchParams.get("department");

    if (!code && !name) return;

    setForm({
      ...emptyForm,
      courseCode: code ?? "",
      courseName: name ?? "",
      department: dept && DEPARTMENTS.includes(dept) ? dept : DEPARTMENTS[0],
    });
    setPrefilled(true);
    setModalMode("create");
    setSelectedClass(null);
    setShowSyllabus(false);
    setFormSuccess("");
    setFormError("");
  }, [searchParams]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (majorDropdownRef.current && !majorDropdownRef.current.contains(e.target as Node)) {
        setMajorDropdownOpen(false);
      }
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target as Node)) {
        setDeptDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredMajors = allMajors.filter((major) =>
    major.toLowerCase().includes(majorSearch.toLowerCase())
  );

  const filteredDepts = DEPARTMENTS.filter((dept) =>
    dept.toLowerCase().includes(deptSearch.toLowerCase())
  );

  const filteredClasses = classes.filter(
    (c) =>
      c.courseCode.toLowerCase().includes(search.toLowerCase()) ||
      c.courseName.toLowerCase().includes(search.toLowerCase()) ||
      c.department.toLowerCase().includes(search.toLowerCase())
  );

  async function fetchClasses() {
    try {
      setLoading(true);
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
  }

  function updateForm<K extends keyof ClassFormState>(key: K, value: ClassFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setSelectedClass(null);
    setPrefilled(false);
    setShowSyllabus(false);
    setMajorSearch("");
    setDeptSearch("");
    setMajorDropdownOpen(false);
    setDeptDropdownOpen(false);
    setFormSuccess("");
    setFormError("");
  }

  function openCreateModal() {
    resetForm();
    setModalMode("create");
  }

  function openEditModal(courseClass: CourseClass) {
    setSelectedClass(courseClass);
    setForm({
      courseCode: courseClass.courseCode,
      courseName: courseClass.courseName,
      department: courseClass.department,
      creditHours: courseClass.creditHours ?? 3,
      description: courseClass.description ?? "",
      syllabus: courseClass.syllabus ?? "",
      relatedMajors: courseClass.relatedMajors ?? [],
    });
    setPrefilled(false);
    setShowSyllabus(Boolean(courseClass.syllabus));
    setMajorSearch("");
    setDeptSearch("");
    setFormSuccess("");
    setFormError("");
    setModalMode("edit");
  }

  function closeFormModal() {
    if (saving) return;
    setModalMode(null);
    resetForm();
  }

  function toggleMajor(major: string) {
    setForm((current) => ({
      ...current,
      relatedMajors: current.relatedMajors.includes(major)
        ? current.relatedMajors.filter((item) => item !== major)
        : [...current.relatedMajors, major],
    }));
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormSuccess("");
    setFormError("");

    const body = {
      courseCode: form.courseCode,
      courseName: form.courseName,
      department: form.department,
      creditHours: form.creditHours,
      description: form.description,
      relatedMajors: form.relatedMajors,
      syllabus: form.syllabus.trim() ? form.syllabus.trim() : undefined,
      ...(modalMode === "edit" && selectedClass ? { classId: selectedClass.classId } : {}),
    };

    try {
      const res = await fetch("/api/admin/classes", {
        method: modalMode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!json.success) {
        setFormError(json.message || "Failed to save class.");
        return;
      }

      setFormSuccess(
        modalMode === "edit"
          ? `Class "${selectedClass?.courseCode}" updated successfully.`
          : `Class "${form.courseCode.toUpperCase()}" created successfully.`
      );
      await fetchClasses();

      if (modalMode === "create") {
        setForm(emptyForm);
        setShowSyllabus(false);
        setPrefilled(false);
        setMajorSearch("");
        setDeptSearch("");
      }
    } catch (err) {
      console.error(err);
      setFormError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function openDeleteModal(courseClass: CourseClass) {
    setDeleteTarget(courseClass);
    setDeleteConfirmation("");
    setDeleteSuccess("");
    setDeleteError("");
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteConfirmation("");
    setDeleteSuccess("");
    setDeleteError("");
  }

  async function handleDelete() {
    if (!deleteTarget || deleteConfirmation !== DELETE_CONFIRMATION) return;

    setDeleting(true);
    setDeleteSuccess("");
    setDeleteError("");

    try {
      const res = await fetch("/api/admin/classes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: deleteTarget.classId,
          confirmation: deleteConfirmation,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        setDeleteError(json.message || "Failed to delete class.");
        return;
      }

      setDeleteSuccess(`Class "${deleteTarget.courseCode}" deleted permanently.`);
      await fetchClasses();
    } catch (err) {
      console.error(err);
      setDeleteError("Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 h-full bg-background animate-in fade-in duration-300">
      <section className="bg-muted/10 border border-border/50 rounded-xl shadow-sm p-6">
        <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 tracking-tight">
              <span>Classes</span>
            </h2>
            <p className="text-muted-foreground text-xs mt-1">
              {classes.length} class{classes.length !== 1 ? "es" : ""} in the database.
            </p>
          </div>

          <div className="flex w-full sm:w-auto items-center gap-2">
            <input
              type="text"
              placeholder="Search classes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 sm:w-64 text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ecu-purple/40 transition-shadow"
            />
            <button
              type="button"
              onClick={openCreateModal}
              className="shrink-0 rounded-lg bg-ecu-purple px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ecu-purple/90"
            >
              Add Class
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground animate-pulse">
            Loading classes...
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 mt-4 bg-background border border-dashed border-border/70 rounded-lg text-center">
            <h3 className="text-lg font-bold text-foreground mb-1">
              {search ? "No matching classes" : "No classes yet"}
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              {search ? "Try a different search term." : "Use Add Class to create the first class."}
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
                  <th className="pb-2 pr-3 font-bold text-foreground hidden sm:table-cell">Enrolled</th>
                  <th className="pb-2 font-bold text-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((courseClass) => (
                  <tr
                    key={courseClass.classId}
                    className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 pr-3 font-bold text-ecu-purple whitespace-nowrap">
                      {courseClass.courseCode}
                    </td>
                    <td className="py-3 pr-3 text-foreground min-w-64">
                      <div className="font-semibold">{courseClass.courseName}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="md:hidden">{courseClass.department}</span>
                        {courseClass.syllabus && (
                          <span className="text-green-600 font-semibold">Syllabus</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground hidden md:table-cell">
                      {courseClass.department}
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground hidden sm:table-cell">
                      {courseClass.creditHours}
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground hidden sm:table-cell">
                      {courseClass.enrolledCount}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(courseClass)}
                          className="rounded-md border border-border px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-muted"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(courseClass)}
                          className="rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-500 transition-colors hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeFormModal();
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/60 hover:[&::-webkit-scrollbar-thumb]:bg-border">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {modalMode === "edit" ? "Edit Class" : "Create New Class"}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {modalMode === "edit"
                    ? "Update class details. Course code and class URL stay locked."
                    : "Manually add a class to the platform."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                className="rounded-md px-2 py-1 text-xl leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close class form"
              >
                x
              </button>
            </div>

            {prefilled && modalMode === "create" && (
              <div className="mb-4 text-sm font-semibold text-ecu-purple bg-ecu-purple/10 border border-ecu-purple/20 rounded-lg px-4 py-2.5 animate-in fade-in duration-200">
                Pre-filled from an approved class request. Review the details before creating it.
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label htmlFor="courseCode" className="block text-sm font-semibold mb-1.5">
                  Course Code <span className="text-red-500">*</span>
                </label>
                <input
                  id="courseCode"
                  type="text"
                  placeholder="e.g. CSCI 2540"
                  value={form.courseCode}
                  onChange={(e) => updateForm("courseCode", e.target.value)}
                  readOnly={modalMode === "edit"}
                  required
                  className={`w-full text-sm border border-border rounded-lg p-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-ecu-purple/40 transition-shadow ${
                    modalMode === "edit" ? "cursor-not-allowed text-muted-foreground bg-muted/20" : ""
                  }`}
                />
              </div>

              <div>
                <label htmlFor="courseName" className="block text-sm font-semibold mb-1.5">
                  Course Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="courseName"
                  type="text"
                  placeholder="e.g. Data Abstraction"
                  value={form.courseName}
                  onChange={(e) => updateForm("courseName", e.target.value)}
                  required
                  className="w-full text-sm border border-border rounded-lg p-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-ecu-purple/40 transition-shadow"
                />
              </div>

              <div ref={deptDropdownRef} className="relative">
                <label className="block text-sm font-semibold mb-1.5">
                  Department <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setDeptDropdownOpen(!deptDropdownOpen);
                    setDeptSearch("");
                  }}
                  className="w-full text-sm border border-border rounded-lg p-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-ecu-purple/40 transition-shadow text-left flex items-center justify-between"
                >
                  <span>{form.department}</span>
                  <span className="text-muted-foreground">{deptDropdownOpen ? "^" : "v"}</span>
                </button>
                {deptDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full border border-border rounded-lg bg-background shadow-lg">
                    <div className="p-2 border-b border-border/50">
                      <input
                        type="text"
                        placeholder="Search departments..."
                        value={deptSearch}
                        onChange={(e) => setDeptSearch(e.target.value)}
                        autoFocus
                        className="w-full text-sm px-2.5 py-1.5 bg-muted/30 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ecu-purple/40"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {filteredDepts.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No departments found</div>
                      ) : (
                        filteredDepts.map((dept) => (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => {
                              updateForm("department", dept);
                              setDeptDropdownOpen(false);
                              setDeptSearch("");
                            }}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                              form.department === dept
                                ? "bg-ecu-purple/10 text-ecu-purple font-semibold"
                                : "text-foreground hover:bg-muted/50"
                            }`}
                          >
                            {dept}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="creditHours" className="block text-sm font-semibold mb-1.5">
                  Credit Hours
                </label>
                <div className="flex items-center border border-border rounded-lg bg-background focus-within:ring-2 focus-within:ring-ecu-purple/40 transition-shadow">
                  <button
                    type="button"
                    onClick={() => updateForm("creditHours", Math.max(1, form.creditHours - 1))}
                    className="px-3 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-l-lg transition-colors"
                  >
                    -
                  </button>
                  <input
                    id="creditHours"
                    type="number"
                    min={1}
                    max={6}
                    value={form.creditHours}
                    onChange={(e) =>
                      updateForm("creditHours", Math.min(6, Math.max(1, Number(e.target.value))))
                    }
                    className="flex-1 text-sm text-center p-2.5 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateForm("creditHours", Math.min(6, form.creditHours + 1))}
                    className="px-3 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-r-lg transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div ref={majorDropdownRef}>
                <label className="block text-sm font-semibold mb-1.5">Related Majors</label>
                {form.relatedMajors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {form.relatedMajors.map((major) => (
                      <span
                        key={major}
                        className="inline-flex items-center gap-1 text-xs font-semibold bg-ecu-purple/10 text-ecu-purple border border-ecu-purple/20 rounded-full px-2.5 py-1"
                      >
                        {major}
                        <button
                          type="button"
                          onClick={() => toggleMajor(major)}
                          className="hover:text-red-500 transition-colors ml-0.5"
                          aria-label={`Remove ${major}`}
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  placeholder={form.relatedMajors.length > 0 ? "Add more majors..." : "Search and select majors..."}
                  value={majorSearch}
                  onChange={(e) => {
                    setMajorSearch(e.target.value);
                    setMajorDropdownOpen(true);
                  }}
                  onFocus={() => setMajorDropdownOpen(true)}
                  className="w-full text-sm border border-border rounded-lg p-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-ecu-purple/40 transition-shadow"
                />
                {majorDropdownOpen && (
                  <div className="mt-1 max-h-40 overflow-y-auto border border-border rounded-lg bg-background shadow-lg">
                    {filteredMajors.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No majors found</div>
                    ) : (
                      filteredMajors.map((major) => (
                        <button
                          key={major}
                          type="button"
                          onClick={() => {
                            toggleMajor(major);
                            setMajorSearch("");
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                            form.relatedMajors.includes(major)
                              ? "bg-ecu-purple/10 text-ecu-purple font-semibold"
                              : "text-foreground hover:bg-muted/50"
                          }`}
                        >
                          {major}
                          {form.relatedMajors.includes(major) && <span className="text-xs">Selected</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-semibold mb-1.5">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={2}
                  placeholder="Short course description..."
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  className="w-full text-sm border border-border rounded-lg p-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-ecu-purple/40 transition-shadow resize-none"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowSyllabus(!showSyllabus)}
                  className="flex items-center gap-2 text-sm font-semibold text-ecu-purple hover:text-ecu-purple/80 transition-colors"
                >
                  <span>{showSyllabus ? "Hide" : "Add"}</span>
                  <span>Syllabus</span>
                </button>

                {showSyllabus && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <textarea
                      id="syllabus"
                      rows={6}
                      placeholder="Paste syllabus text here, or describe the class structure, key topics, and purpose."
                      value={form.syllabus}
                      onChange={(e) => updateForm("syllabus", e.target.value)}
                      className="w-full text-sm border border-ecu-purple/30 rounded-lg p-2.5 bg-ecu-purple/5 focus:outline-none focus:ring-2 focus:ring-ecu-purple/40 transition-shadow resize-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/60 hover:[&::-webkit-scrollbar-thumb]:bg-border"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      This context can be used by AI checks to verify uploaded materials are relevant.
                    </p>
                  </div>
                )}
              </div>

              {formSuccess && (
                <div className="text-sm font-semibold text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 animate-in fade-in duration-200">
                  {formSuccess}
                </div>
              )}
              {formError && (
                <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 animate-in fade-in duration-200">
                  {formError}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-ecu-purple px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ecu-purple/90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : modalMode === "edit" ? "Save Changes" : "Create Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDeleteModal();
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-red-500/30 bg-background p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-red-500">Delete Class</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This permanently removes {deleteTarget.courseCode} if no linked data exists.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-md px-2 py-1 text-xl leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close delete dialog"
              >
                x
              </button>
            </div>

            <div className="rounded-lg border border-border bg-muted/10 p-4 text-sm">
              <div className="font-bold text-foreground">{deleteTarget.courseCode}</div>
              <div className="text-muted-foreground">{deleteTarget.courseName}</div>
            </div>

            <label htmlFor="deleteConfirmation" className="mt-5 block text-sm font-semibold">
              Type <span className="text-red-500">delete permanently</span> to confirm.
            </label>
            <input
              id="deleteConfirmation"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
              autoComplete="off"
            />

            {deleteSuccess && (
              <div className="mt-4 text-sm font-semibold text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                {deleteSuccess}
              </div>
            )}
            {deleteError && (
              <div className="mt-4 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                {deleteError}
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || deleteConfirmation !== DELETE_CONFIRMATION || Boolean(deleteSuccess)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
