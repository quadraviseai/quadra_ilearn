import { useCallback, useEffect, useState } from "react";
import { Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Slider, Space, Steps, Table, Tag, Upload, message } from "antd";

import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

const TEMPLATE_PATTERN_LIBRARY = {
  inclusion_exclusion: {
    label: "Inclusion-Exclusion",
    templateType: "logic",
    defaultQuestionType: "mcq_single",
    templateText: "n(A)={x}, n(B)={y}, n(A∩B)={z}, find n(A∪B)",
    formula: "x + y - z",
    previewText: ({ x, y, z }) => `If n(A)=${x}, n(B)=${y}, n(A∩B)=${z}, find n(A∪B).`,
    fields: [
      { key: "x", label: "Min value for A", rangeKey: "min", defaultValue: 20 },
      { key: "x", label: "Max value for A", rangeKey: "max", defaultValue: 60 },
      { key: "y", label: "Min value for B", rangeKey: "min", defaultValue: 15 },
      { key: "y", label: "Max value for B", rangeKey: "max", defaultValue: 70 },
      { key: "z", label: "Min overlap", rangeKey: "min", defaultValue: 5 },
      { key: "z", label: "Max overlap", rangeKey: "max", defaultValue: 25 },
    ],
  },
  percentage_increase: {
    label: "Percentage Increase",
    templateType: "word",
    defaultQuestionType: "mcq_single",
    templateText: "A value is {base}. It increases by {percent}%. What is the new value?",
    formula: "base * (100 + percent) / 100",
    previewText: ({ base, percent }) => `A value is ${base}. It increases by ${percent}%. What is the new value?`,
    fields: [
      { key: "base", label: "Min base value", rangeKey: "min", defaultValue: 40 },
      { key: "base", label: "Max base value", rangeKey: "max", defaultValue: 120 },
      { key: "percent", label: "Min increase %", rangeKey: "min", defaultValue: 5 },
      { key: "percent", label: "Max increase %", rangeKey: "max", defaultValue: 30 },
    ],
  },
  ratio_share: {
    label: "Ratio Share",
    templateType: "word",
    defaultQuestionType: "mcq_single",
    templateText: "Two values are in the ratio {a}:{b}. If the total is {total}, find the first value.",
    formula: "total * a / (a + b)",
    previewText: ({ a, b, total }) => `Two values are in the ratio ${a}:${b}. If the total is ${total}, find the first value.`,
    fields: [
      { key: "a", label: "Min first ratio", rangeKey: "min", defaultValue: 1 },
      { key: "a", label: "Max first ratio", rangeKey: "max", defaultValue: 5 },
      { key: "b", label: "Min second ratio", rangeKey: "min", defaultValue: 1 },
      { key: "b", label: "Max second ratio", rangeKey: "max", defaultValue: 7 },
      { key: "total", label: "Min total value", rangeKey: "min", defaultValue: 30 },
      { key: "total", label: "Max total value", rangeKey: "max", defaultValue: 150 },
    ],
  },
};

const TEMPLATE_DIFFICULTY_MARKS = {
  1: "Easy",
  2: "",
  3: "Medium",
  4: "",
  5: "Hard",
};

function inferTemplatePattern(template) {
  if (!template) {
    return { patternKey: "inclusion_exclusion", patternValues: {} };
  }

  if (template.formula === "x + y - z" && template.variables?.x && template.variables?.y && template.variables?.z) {
    return {
      patternKey: "inclusion_exclusion",
      patternValues: {
        x_min: template.variables.x?.[0],
        x_max: template.variables.x?.[1],
        y_min: template.variables.y?.[0],
        y_max: template.variables.y?.[1],
        z_min: template.variables.z?.[0],
        z_max: template.variables.z?.[1],
      },
    };
  }

  if (template.formula === "base * (100 + percent) / 100" && template.variables?.base && template.variables?.percent) {
    return {
      patternKey: "percentage_increase",
      patternValues: {
        base_min: template.variables.base?.[0],
        base_max: template.variables.base?.[1],
        percent_min: template.variables.percent?.[0],
        percent_max: template.variables.percent?.[1],
      },
    };
  }

  if (template.formula === "total * a / (a + b)" && template.variables?.a && template.variables?.b && template.variables?.total) {
    return {
      patternKey: "ratio_share",
      patternValues: {
        a_min: template.variables.a?.[0],
        a_max: template.variables.a?.[1],
        b_min: template.variables.b?.[0],
        b_max: template.variables.b?.[1],
        total_min: template.variables.total?.[0],
        total_max: template.variables.total?.[1],
      },
    };
  }

  return { patternKey: "inclusion_exclusion", patternValues: {} };
}

function AdminContentPage() {
  const { token } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [activeSection, setActiveSection] = useState("exams");
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examOpen, setExamOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [conceptOpen, setConceptOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [chapterBulkUploadOpen, setChapterBulkUploadOpen] = useState(false);
  const [conceptBulkUploadOpen, setConceptBulkUploadOpen] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [questionJsonImportOpen, setQuestionJsonImportOpen] = useState(false);
  const [templateJsonImportOpen, setTemplateJsonImportOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [editingChapter, setEditingChapter] = useState(null);
  const [editingConcept, setEditingConcept] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [generatedPreviewQuestions, setGeneratedPreviewQuestions] = useState([]);
  const [templatePatternKey, setTemplatePatternKey] = useState("inclusion_exclusion");
  const [templatePreviewText, setTemplatePreviewText] = useState("");
  const [questionStep, setQuestionStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [bulkDeletingSection, setBulkDeletingSection] = useState(null);
  const [searchValues, setSearchValues] = useState({
    exams: "",
    subjects: "",
    chapters: "",
    concepts: "",
    templates: "",
    questions: "",
  });
  const [questionFilters, setQuestionFilters] = useState({
    concept: "",
    templateType: "",
    difficulty: "",
    source: "",
    status: "",
  });
  const [tablePagination, setTablePagination] = useState({
    exams: { current: 1, pageSize: 8 },
    subjects: { current: 1, pageSize: 8 },
    chapters: { current: 1, pageSize: 8 },
    concepts: { current: 1, pageSize: 8 },
    templates: { current: 1, pageSize: 8 },
    questions: { current: 1, pageSize: 8 },
  });
  const [examForm] = Form.useForm();
  const [subjectForm] = Form.useForm();
  const [chapterForm] = Form.useForm();
  const [conceptForm] = Form.useForm();
  const [templateForm] = Form.useForm();
  const [chapterBulkUploadForm] = Form.useForm();
  const [conceptBulkUploadForm] = Form.useForm();
  const [questionForm] = Form.useForm();
  const [bulkUploadForm] = Form.useForm();
  const [questionJsonImportForm] = Form.useForm();
  const [templateJsonImportForm] = Form.useForm();
  const [generatorForm] = Form.useForm();
  const questionType = Form.useWatch("question_type", questionForm);
  const conceptFormSubjectId = Form.useWatch("subject", conceptForm);
  const questionExamIds = Form.useWatch("exam_ids", questionForm);
  const questionStatus = Form.useWatch("status", questionForm);
  const questionSubjectId = Form.useWatch("subject_id", questionForm);
  const questionChapterId = Form.useWatch("chapter_id", questionForm);
  const questionConceptId = Form.useWatch("concept_id", questionForm);
  const bulkSubjectId = Form.useWatch("subject_id", bulkUploadForm);
  const bulkChapterId = Form.useWatch("chapter_id", bulkUploadForm);
  const bulkConceptId = Form.useWatch("concept_id", bulkUploadForm);
  const chapterBulkSubjectId = Form.useWatch("subject_id", chapterBulkUploadForm);
  const conceptBulkExamIds = Form.useWatch("exam_ids", conceptBulkUploadForm);
  const conceptBulkSubjectId = Form.useWatch("subject_id", conceptBulkUploadForm);
  const conceptBulkChapterId = Form.useWatch("chapter_id", conceptBulkUploadForm);
  const generatorSubjectId = Form.useWatch("subject_id", generatorForm);
  const generatorChapterId = Form.useWatch("chapter_id", generatorForm);
  const generatorConceptId = Form.useWatch("concept_id", generatorForm);
  const generatorDifficultyValue = Form.useWatch("difficulty", generatorForm) || "medium";
  const generatorCountValue = Form.useWatch("count", generatorForm) || 5;

  const normalizeExamType = useCallback((value) => {
    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) {
      return [value.trim()];
    }
    return [];
  }, []);

  const buildQuestionFormValues = useCallback(
    (question = null) =>
      question
        ? {
            subject_id: question.subject,
            chapter_id: question.chapter,
            concept_id: question.concept,
            exam_ids: (question.exams || []).map((exam) => exam.id),
            exam_type: normalizeExamType(question.exam_type),
            question_type: question.question_type,
            prompt: question.prompt,
            explanation: question.explanation,
            difficulty_level: question.difficulty_level,
            status: question.status,
            options:
              question.options?.length > 0
                ? question.options.map((option, index) => ({
                    option_text: option.option_text,
                    is_correct: option.is_correct,
                    display_order: option.display_order || index + 1,
                  }))
                : [],
          }
        : {
            exam_ids: [],
            exam_type: [],
            question_type: "mcq_single",
            difficulty_level: 1,
            status: "active",
            options: [
              { option_text: "", is_correct: false, display_order: 1 },
              { option_text: "", is_correct: true, display_order: 2 },
            ],
          },
    [normalizeExamType],
  );

  const buildTemplatePayload = useCallback((values) => {
    const pattern = TEMPLATE_PATTERN_LIBRARY[values.pattern_key];
    const variables = {};
    const previewVariables = {};

    pattern.fields.forEach((field) => {
      const minValue = Number(values[`${field.key}_min`]);
      const maxValue = Number(values[`${field.key}_max`]);
      variables[field.key] = [minValue, maxValue];
      previewVariables[field.key] = Math.round((minValue + maxValue) / 2);
    });

    return {
      concept: values.concept,
      secondary_concept: values.secondary_concept || null,
      question_type: values.question_type,
      template_type: pattern.templateType,
      difficulty: values.difficulty_level <= 2 ? "easy" : values.difficulty_level <= 4 ? "medium" : "hard",
      template_text: pattern.templateText,
      variables,
      formula: pattern.formula,
      status: values.status,
      previewText: pattern.previewText(previewVariables),
    };
  }, []);

  const syncTemplatePreview = useCallback(
    (formValues = null) => {
      const values = formValues || templateForm.getFieldsValue(true);
      const patternKey = values.pattern_key || "inclusion_exclusion";
      const pattern = TEMPLATE_PATTERN_LIBRARY[patternKey];
      if (!pattern) {
        setTemplatePreviewText("");
        return;
      }

      const previewVariables = {};
      pattern.fields.forEach((field) => {
        const minValue = Number(values[`${field.key}_min`] ?? field.defaultValue ?? 1);
        const maxValue = Number(values[`${field.key}_max`] ?? field.defaultValue ?? 1);
        previewVariables[field.key] = Math.round((minValue + maxValue) / 2);
      });
      setTemplatePreviewText(pattern.previewText(previewVariables));
    },
    [templateForm],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [examsData, subjectsData, chaptersData, conceptsData, templatesData, questionsData] = await Promise.all([
        apiRequest("/api/admin/exams", { token }),
        apiRequest("/api/admin/subjects", { token }),
        apiRequest("/api/admin/chapters", { token }),
        apiRequest("/api/admin/concepts", { token }),
        apiRequest("/api/admin/templates", { token }),
        apiRequest("/api/admin/questions", { token }),
      ]);
      setExams(examsData);
      setSubjects(subjectsData);
      setChapters(chaptersData);
      setConcepts(conceptsData);
      setTemplates(templatesData);
      setQuestions(questionsData);
    } catch (requestError) {
      messageApi.error(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [messageApi, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!questionOpen) {
      return;
    }
    questionForm.setFieldsValue(buildQuestionFormValues(editingQuestion));
  }, [buildQuestionFormValues, editingQuestion, questionForm, questionOpen]);

  const handleCreate = async (path, form, close) => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await apiRequest(path, {
        method: "POST",
        token,
        body: values,
      });
      messageApi.success("Saved.");
      close(false);
      form.resetFields();
      loadData();
    } catch (requestError) {
      if (requestError?.errorFields) {
        return;
      }
      messageApi.error(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuestionModalClose = () => {
    setQuestionOpen(false);
    setQuestionStep(0);
    setEditingQuestion(null);
    questionForm.resetFields();
  };

  const handleExamModalClose = () => {
    setExamOpen(false);
    setEditingExam(null);
    examForm.resetFields();
  };

  const handleSubjectModalClose = () => {
    setSubjectOpen(false);
    setEditingSubject(null);
    subjectForm.resetFields();
  };

  const handleChapterModalClose = () => {
    setChapterOpen(false);
    setEditingChapter(null);
    chapterForm.resetFields();
  };

  const handleConceptModalClose = () => {
    setConceptOpen(false);
    setEditingConcept(null);
    conceptForm.resetFields();
  };

  const handleTemplateModalClose = () => {
    setTemplateOpen(false);
    setEditingTemplate(null);
    setTemplatePatternKey("inclusion_exclusion");
    setTemplatePreviewText("");
    templateForm.resetFields();
  };

  const handleChapterBulkUploadClose = () => {
    setChapterBulkUploadOpen(false);
    chapterBulkUploadForm.resetFields();
  };

  const handleBulkUploadClose = () => {
    setBulkUploadOpen(false);
    bulkUploadForm.resetFields();
  };

  const handleQuestionJsonImportClose = () => {
    setQuestionJsonImportOpen(false);
    questionJsonImportForm.resetFields();
  };

  const handleTemplateJsonImportClose = () => {
    setTemplateJsonImportOpen(false);
    templateJsonImportForm.resetFields();
  };

  const handleConceptBulkUploadClose = () => {
    setConceptBulkUploadOpen(false);
    conceptBulkUploadForm.resetFields();
  };

  const handleGeneratorClose = () => {
    setGeneratorOpen(false);
    generatorForm.resetFields();
  };

  const handlePreviewClose = () => {
    setPreviewOpen(false);
    setGeneratedPreviewQuestions([]);
  };

  const handleQuestionNext = async () => {
    try {
      await questionForm.validateFields([
        "subject_id",
        "chapter_id",
        "concept_id",
        "exam_ids",
        "exam_type",
        "question_type",
        "prompt",
        "explanation",
        "difficulty_level",
        "status",
      ]);
      setQuestionStep(questionType === "numeric" ? 1 : 1);
    } catch {
      return;
    }
  };

  const handleQuestionSubmit = async () => {
    try {
      if (questionType !== "numeric") {
        await questionForm.validateFields(["options"]);
      }
      const values = questionForm.getFieldsValue(true);
      const selectedExams = exams.filter((exam) => (values.exam_ids || []).includes(exam.id));
      setSaving(true);
      await apiRequest(editingQuestion ? `/api/admin/questions/${editingQuestion.id}` : "/api/admin/questions", {
        method: editingQuestion ? "PATCH" : "POST",
        token,
        body: {
          ...values,
          exam_type: selectedExams.map((exam) => exam.name),
        },
      });
      messageApi.success(editingQuestion ? "Question updated." : "Question created.");
      handleQuestionModalClose();
      loadData();
    } catch (requestError) {
      if (requestError?.errorFields) {
        return;
      }
      messageApi.error(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const syncOptionOrder = () => {
    const currentOptions = questionForm.getFieldValue("options") || [];
    questionForm.setFieldValue(
      "options",
      currentOptions.map((option, index) => ({
        ...option,
        display_order: index + 1,
      })),
    );
  };

  const handleSubjectSubmit = async () => {
    try {
      const values = await subjectForm.validateFields();
      setSaving(true);
      await apiRequest(editingSubject ? `/api/admin/subjects/${editingSubject.id}` : "/api/admin/subjects", {
        method: editingSubject ? "PATCH" : "POST",
        token,
        body: values,
      });
      messageApi.success(editingSubject ? "Subject updated." : "Subject created.");
      handleSubjectModalClose();
      loadData();
    } catch (requestError) {
      if (requestError?.errorFields) {
        return;
      }
      messageApi.error(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExamSubmit = async () => {
    try {
      const values = await examForm.validateFields();
      setSaving(true);
      await apiRequest(editingExam ? `/api/admin/exams/${editingExam.id}` : "/api/admin/exams", {
        method: editingExam ? "PATCH" : "POST",
        token,
        body: values,
      });
      messageApi.success(editingExam ? "Exam updated." : "Exam created.");
      handleExamModalClose();
      loadData();
    } catch (requestError) {
      if (requestError?.errorFields) {
        return;
      }
      messageApi.error(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChapterSubmit = async () => {
    try {
      const values = await chapterForm.validateFields();
      setSaving(true);
      await apiRequest(editingChapter ? `/api/admin/chapters/${editingChapter.id}` : "/api/admin/chapters", {
        method: editingChapter ? "PATCH" : "POST",
        token,
        body: values,
      });
      messageApi.success(editingChapter ? "Chapter updated." : "Chapter created.");
      handleChapterModalClose();
      loadData();
    } catch (requestError) {
      if (requestError?.errorFields) {
        return;
      }
      messageApi.error(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConceptSubmit = async () => {
    try {
      const values = await conceptForm.validateFields();
      setSaving(true);
      await apiRequest(editingConcept ? `/api/admin/concepts/${editingConcept.id}` : "/api/admin/concepts", {
        method: editingConcept ? "PATCH" : "POST",
        token,
        body: values,
      });
      messageApi.success(editingConcept ? "Concept updated." : "Concept created.");
      handleConceptModalClose();
      loadData();
    } catch (requestError) {
      if (requestError?.errorFields) {
        return;
      }
      messageApi.error(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUploadSubmit = async () => {
    try {
      const values = await bulkUploadForm.validateFields();
      const parsedQuestions = JSON.parse(values.questions_json);
      setSaving(true);
      await apiRequest("/api/admin/questions/bulk-upload", {
        method: "POST",
        token,
        body: {
          subject_id: values.subject_id,
          chapter_id: values.chapter_id,
          concept_id: values.concept_id,
          exam_ids: values.exam_ids || [],
          questions: parsedQuestions,
        },
      });
      messageApi.success("Questions uploaded.");
      handleBulkUploadClose();
      loadData();
    } catch (requestError) {
      if (requestError?.errorFields) {
        return;
      }
      messageApi.error(requestError.message || "Bulk upload failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleConceptBulkUploadSubmit = async () => {
    try {
      const values = await conceptBulkUploadForm.validateFields();
      const conceptNames = String(values.concepts_text || "")
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
      setSaving(true);
      const response = await apiRequest("/api/admin/concepts/bulk-upload", {
        method: "POST",
        token,
        body: {
          subject_id: values.subject_id,
          chapter_id: values.chapter_id,
          exam_ids: values.exam_ids || [],
          concept_names: conceptNames,
        },
      });
      messageApi.success(
        response.count > 0
          ? `Uploaded ${response.count} concepts.`
          : "No new concepts were created because the uploaded names already exist.",
      );
      handleConceptBulkUploadClose();
      loadData();
    } catch (requestError) {
      if (requestError?.errorFields) {
        return;
      }
      messageApi.error(requestError.message || "Concept upload failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuestionJsonImportSubmit = async () => {
    try {
      const values = await questionJsonImportForm.validateFields();
      const file = values.import_file?.[0]?.originFileObj;
      if (!file) {
        messageApi.error("Select a JSON file.");
        return;
      }
      const payload = JSON.parse(await file.text());
      setSaving(true);
      const response = await apiRequest("/api/admin/questions/import-json", {
        method: "POST",
        token,
        body: payload,
      });
      messageApi.success(
        response.count > 0
          ? `Imported ${response.count} questions from JSON.`
          : "No questions were imported.",
      );
      handleQuestionJsonImportClose();
      loadData();
    } catch (requestError) {
      if (requestError?.errorFields) {
        return;
      }
      if (requestError instanceof SyntaxError) {
        messageApi.error("The selected file does not contain valid JSON.");
        return;
      }
      messageApi.error(requestError.message || "Question JSON import failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateJsonImportSubmit = async () => {
    try {
      const values = await templateJsonImportForm.validateFields();
      const file = values.import_file?.[0]?.originFileObj;
      const jsonText = String(values.json_text || "").trim();
      let payload;
      if (jsonText) {
        payload = JSON.parse(jsonText);
      } else if (file) {
        payload = JSON.parse(await file.text());
      } else {
        messageApi.error("Upload a JSON file or paste JSON content.");
        return;
      }
      setSaving(true);
      const response = await apiRequest("/api/admin/templates/import-json", {
        method: "POST",
        token,
        body: payload,
      });
      messageApi.success(
        response.count > 0 ? `Imported ${response.count} templates from JSON.` : "No templates were imported.",
      );
      handleTemplateJsonImportClose();
      loadData();
    } catch (requestError) {
      if (requestError?.errorFields) {
        return;
      }
      if (requestError instanceof SyntaxError) {
        messageApi.error("The selected file does not contain valid JSON.");
        return;
      }
      messageApi.error(requestError.message || "Template JSON import failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleChapterBulkUploadSubmit = async () => {
    try {
      const values = await chapterBulkUploadForm.validateFields();
      const chapterNames = String(values.chapters_text || "")
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
      setSaving(true);
      const response = await apiRequest("/api/admin/chapters/bulk-upload", {
        method: "POST",
        token,
        body: {
          subject_id: values.subject_id,
          exam_ids: values.exam_ids || [],
          chapter_names: chapterNames,
        },
      });
      messageApi.success(
        response.count > 0
          ? `Uploaded ${response.count} chapters.`
          : "No new chapters were created because the uploaded names already exist.",
      );
      handleChapterBulkUploadClose();
      loadData();
    } catch (requestError) {
      if (requestError?.errorFields) {
        return;
      }
      messageApi.error(requestError.message || "Chapter upload failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateSubmit = async () => {
    try {
      const values = await templateForm.validateFields();
      const payload = buildTemplatePayload(values);
      setSaving(true);
      await apiRequest(editingTemplate ? `/api/admin/templates/${editingTemplate.id}` : "/api/admin/templates", {
        method: editingTemplate ? "PATCH" : "POST",
        token,
        body: payload,
      });
      messageApi.success(editingTemplate ? "Template updated." : "Template created.");
      handleTemplateModalClose();
      loadData();
    } catch (requestError) {
      if (requestError?.errorFields) {
        return;
      }
      messageApi.error(requestError.message || "Template save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratorSubmit = async () => {
    try {
      const values = await generatorForm.validateFields();
      setSaving(true);
      const response = await apiRequest("/api/admin/questions/generate-preview", {
        method: "POST",
        token,
        body: values,
      });
      setGeneratedPreviewQuestions(response.questions || []);
      setPreviewOpen(true);
      setGeneratorOpen(false);
      messageApi.success(`Generated ${response.count} preview questions.`);
    } catch (requestError) {
      if (requestError?.errorFields) {
        return;
      }
      messageApi.error(requestError.message || "Question generation failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleApproveGeneratedQuestions = async () => {
    try {
      if (!generatedPreviewQuestions.length) {
        messageApi.error("No preview questions left to approve.");
        return;
      }
      setSaving(true);
      const response = await apiRequest("/api/admin/questions/save-generated", {
        method: "POST",
        token,
        body: { questions: generatedPreviewQuestions },
      });
      messageApi.success(`Saved ${response.count} generated questions.`);
      handlePreviewClose();
      loadData();
    } catch (requestError) {
      messageApi.error(requestError.message || "Saving generated questions failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkQuestionStatusUpdate = async (questionsToUpdate, nextStatus, successMessage) => {
    if (!questionsToUpdate.length) {
      messageApi.error("No matching questions found for this action.");
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        questionsToUpdate.map((question) =>
          apiRequest(`/api/admin/questions/${question.id}`, {
            method: "PATCH",
            token,
            body: { status: nextStatus },
          }),
        ),
      );
      messageApi.success(successMessage);
      loadData();
    } catch (requestError) {
      messageApi.error(requestError.message || "Question status update failed.");
    } finally {
      setSaving(false);
    }
  };

  const openSubjectEditor = (subject = null) => {
    setEditingSubject(subject);
    setSubjectOpen(true);
    subjectForm.setFieldsValue({ name: subject?.name || "", exam_ids: (subject?.exams || []).map((exam) => exam.id) });
  };

  const openConceptEditor = (concept = null) => {
    setEditingConcept(concept);
    setConceptOpen(true);
    conceptForm.setFieldsValue({
      subject: concept?.subject || undefined,
      chapter: concept?.chapter || undefined,
      name: concept?.name || "",
      description: concept?.description || "",
      exam_ids: (concept?.exams || []).map((exam) => exam.id),
    });
  };

  const openTemplateEditor = (template = null) => {
    setEditingTemplate(template);
    setTemplateOpen(true);
    const inferred = inferTemplatePattern(template);
    setTemplatePatternKey(inferred.patternKey);
    templateForm.setFieldsValue({
      concept: template?.concept || undefined,
      secondary_concept: template?.secondary_concept || undefined,
      pattern_key: inferred.patternKey,
      question_type: template?.question_type || TEMPLATE_PATTERN_LIBRARY[inferred.patternKey].defaultQuestionType,
      difficulty_level: template?.difficulty === "easy" ? 1 : template?.difficulty === "hard" ? 5 : 3,
      status: template?.status || "draft",
      ...inferred.patternValues,
    });
    setTimeout(() => syncTemplatePreview({ ...templateForm.getFieldsValue(true), pattern_key: inferred.patternKey, ...inferred.patternValues, question_type: template?.question_type || TEMPLATE_PATTERN_LIBRARY[inferred.patternKey].defaultQuestionType, difficulty_level: template?.difficulty === "easy" ? 1 : template?.difficulty === "hard" ? 5 : 3, status: template?.status || "draft" }), 0);
  };

  const openChapterEditor = (chapter = null) => {
    setEditingChapter(chapter);
    setChapterOpen(true);
    chapterForm.setFieldsValue({
      subject: chapter?.subject || undefined,
      name: chapter?.name || "",
      description: chapter?.description || "",
      exam_ids: (chapter?.exams || []).map((exam) => exam.id),
    });
  };

  const openExamEditor = (exam = null) => {
    setEditingExam(exam);
    setExamOpen(true);
    examForm.setFieldsValue({ name: exam?.name || "" });
  };

  const openQuestionEditor = (question = null) => {
    setEditingQuestion(question);
    setQuestionOpen(true);
    setQuestionStep(0);
  };

  const deleteItem = async (path, successMessage) => {
    try {
      await apiRequest(path, {
        method: "DELETE",
        token,
      });
      messageApi.success(successMessage);
      loadData();
    } catch (requestError) {
      messageApi.error(requestError.message);
    }
  };

  const buildDeletePath = (section, id) => {
    if (section === "exams") {
      return `/api/admin/exams/${id}`;
    }
    if (section === "subjects") {
      return `/api/admin/subjects/${id}`;
    }
    if (section === "chapters") {
      return `/api/admin/chapters/${id}`;
    }
    if (section === "concepts") {
      return `/api/admin/concepts/${id}`;
    }
    return `/api/admin/questions/${id}`;
  };

  const formatExamType = (value) => {
    const normalized = normalizeExamType(value);
    return normalized.length > 0 ? normalized.join(", ") : "General";
  };

  const formatExamNames = (linkedExams = []) => {
    if (!linkedExams?.length) {
      return "None";
    }
    return linkedExams.map((exam) => exam.name).join(", ");
  };

  const subjectOptions = subjects.map((subject) => ({ label: subject.name, value: subject.id }));
  const chapterOptions = chapters.map((chapter) => ({
    label: chapter.name,
    value: chapter.id,
  }));
  const conceptOptions = concepts.map((concept) => ({
    label: concept.name,
    value: concept.id,
  }));
  const examOptions = exams.map((exam) => ({ label: exam.name, value: exam.id }));
  const selectedQuestionSubject = subjects.find((subject) => subject.id === questionSubjectId);
  const selectedQuestionChapter = chapters.find((chapter) => chapter.id === questionChapterId);
  const selectedQuestionConcept = concepts.find((concept) => concept.id === questionConceptId);
  const selectedBulkSubject = subjects.find((subject) => subject.id === bulkSubjectId);
  const selectedBulkChapter = chapters.find((chapter) => chapter.id === bulkChapterId);
  const selectedBulkConcept = concepts.find((concept) => concept.id === bulkConceptId);
  const selectedChapterBulkSubject = subjects.find((subject) => subject.id === chapterBulkSubjectId);
  const selectedConceptBulkSubject = subjects.find((subject) => subject.id === conceptBulkSubjectId);
  const selectedConceptBulkChapter = chapters.find((chapter) => chapter.id === conceptBulkChapterId);
  const selectedGeneratorSubject = subjects.find((subject) => subject.id === generatorSubjectId);
  const selectedGeneratorChapter = chapters.find((chapter) => chapter.id === generatorChapterId);
  const selectedGeneratorConcept = concepts.find((concept) => concept.id === generatorConceptId);
  const hasAllSelectedExams = (linkedExams = [], selectedExamIds = []) => {
    if (!selectedExamIds?.length) {
      return true;
    }
    const linkedExamIds = new Set(linkedExams.map((exam) => exam.id));
    return selectedExamIds.every((examId) => linkedExamIds.has(examId));
  };
  const questionSubjectOptions = subjectOptions.filter((subject) =>
    hasAllSelectedExams(subjects.find((item) => item.id === subject.value)?.exams || [], questionExamIds || []),
  );
  const questionConceptOptions = conceptOptions.filter((concept) => {
    const conceptRecord = concepts.find((item) => item.id === concept.value);
    if (!conceptRecord) {
      return false;
    }
    if (questionSubjectId && conceptRecord.subject !== questionSubjectId) {
      return false;
    }
    if (questionChapterId && conceptRecord.chapter !== questionChapterId) {
      return false;
    }
    return hasAllSelectedExams(conceptRecord.exams || [], questionExamIds || []);
  });
  const questionChapterOptions = chapterOptions.filter((chapter) => {
    const chapterRecord = chapters.find((item) => item.id === chapter.value);
    if (!chapterRecord) {
      return false;
    }
    if (questionSubjectId && chapterRecord.subject !== questionSubjectId) {
      return false;
    }
    return hasAllSelectedExams(chapterRecord.exams || [], questionExamIds || []);
  });
  const bulkChapterOptions = chapterOptions.filter((chapter) => {
    const chapterRecord = chapters.find((item) => item.id === chapter.value);
    if (!chapterRecord || (chapterRecord.concept_count || 0) <= 0) {
      return false;
    }
    if (bulkSubjectId && chapterRecord.subject !== bulkSubjectId) {
      return false;
    }
    return true;
  });
  const bulkConceptOptions = bulkSubjectId
    ? conceptOptions.filter((concept) => {
        const record = concepts.find((item) => item.id === concept.value);
        return record?.subject === bulkSubjectId && (!bulkChapterId || record.chapter === bulkChapterId);
      })
    : conceptOptions;
  const conceptBulkSubjectOptions = subjectOptions.filter((subject) =>
    hasAllSelectedExams(subjects.find((item) => item.id === subject.value)?.exams || [], conceptBulkExamIds || []),
  );
  const conceptBulkChapterOptions = chapterOptions.filter((chapter) => {
    const chapterRecord = chapters.find((item) => item.id === chapter.value);
    if (!chapterRecord) {
      return false;
    }
    if (conceptBulkSubjectId && chapterRecord.subject !== conceptBulkSubjectId) {
      return false;
    }
    return hasAllSelectedExams(chapterRecord.exams || [], conceptBulkExamIds || []);
  });
  const generatorChapterOptions = generatorSubjectId
    ? chapterOptions.filter((chapter) => chapters.find((item) => item.id === chapter.value)?.subject === generatorSubjectId)
    : chapterOptions;
  const generatorConceptOptions = generatorSubjectId
    ? conceptOptions.filter((concept) => {
        const record = concepts.find((item) => item.id === concept.value);
        return record?.subject === generatorSubjectId && (!generatorChapterId || record.chapter === generatorChapterId);
      })
    : conceptOptions;
  const matchingGeneratorTemplates = templates.filter((template) => {
    if (!generatorConceptId || template.concept !== generatorConceptId) {
      return false;
    }
    return template.difficulty === generatorDifficultyValue && template.status === "active";
  });
  const matchingGeneratorTemplateTypes = [...new Set(matchingGeneratorTemplates.map((template) => template.template_type))];
  const getCommonExamOptions = (subject, chapter, concept) => {
    if (!subject && !chapter && !concept) {
      return examOptions;
    }
    const subjectExamIds = new Set((subject?.exams || []).map((exam) => exam.id));
    const chapterExamIds = new Set((chapter?.exams || []).map((exam) => exam.id));
    const conceptExamIds = new Set((concept?.exams || []).map((exam) => exam.id));
    if (subject && chapter && concept) {
      return examOptions.filter(
        (exam) => subjectExamIds.has(exam.value) && chapterExamIds.has(exam.value) && conceptExamIds.has(exam.value),
      );
    }
    if (subject && chapter) {
      return examOptions.filter((exam) => subjectExamIds.has(exam.value) && chapterExamIds.has(exam.value));
    }
    if (subject) {
      return examOptions.filter((exam) => subjectExamIds.has(exam.value));
    }
    if (chapter) {
      return examOptions.filter((exam) => chapterExamIds.has(exam.value));
    }
    if (concept) {
      return examOptions.filter((exam) => conceptExamIds.has(exam.value));
    }
    return examOptions;
  };
  const questionExamOptions = getCommonExamOptions(selectedQuestionSubject, selectedQuestionChapter, selectedQuestionConcept);
  const bulkExamOptions = getCommonExamOptions(selectedBulkSubject, selectedBulkChapter, selectedBulkConcept);
  const chapterBulkExamOptions = getCommonExamOptions(selectedChapterBulkSubject, null, null);
  const conceptBulkExamOptions = getCommonExamOptions(selectedConceptBulkSubject, selectedConceptBulkChapter, null);
  const generatorExamOptions = getCommonExamOptions(selectedGeneratorSubject, selectedGeneratorChapter, selectedGeneratorConcept);

  useEffect(() => {
    const currentSubjectId = bulkUploadForm.getFieldValue("subject_id");
    if (!currentSubjectId && subjectOptions.length === 1) {
      bulkUploadForm.setFieldValue("subject_id", subjectOptions[0].value);
    }
  }, [bulkUploadForm, subjectOptions]);

  useEffect(() => {
    const currentSubjectId = bulkUploadForm.getFieldValue("subject_id");
    if (!currentSubjectId) {
      if (bulkUploadForm.getFieldValue("chapter_id")) {
        bulkUploadForm.setFieldValue("chapter_id", undefined);
      }
      if (bulkUploadForm.getFieldValue("concept_id")) {
        bulkUploadForm.setFieldValue("concept_id", undefined);
      }
      if ((bulkUploadForm.getFieldValue("exam_ids") || []).length) {
        bulkUploadForm.setFieldValue("exam_ids", []);
      }
      return;
    }

    const validChapterIds = new Set(bulkChapterOptions.map((option) => option.value));
    const currentChapterId = bulkUploadForm.getFieldValue("chapter_id");
    if (currentChapterId && !validChapterIds.has(currentChapterId)) {
      bulkUploadForm.setFieldValue("chapter_id", undefined);
      bulkUploadForm.setFieldValue("concept_id", undefined);
      bulkUploadForm.setFieldValue("exam_ids", []);
      return;
    }
    if (!currentChapterId && bulkChapterOptions.length === 1) {
      bulkUploadForm.setFieldValue("chapter_id", bulkChapterOptions[0].value);
    }
  }, [bulkChapterOptions, bulkSubjectId, bulkUploadForm]);

  useEffect(() => {
    const currentChapterId = bulkUploadForm.getFieldValue("chapter_id");
    if (!currentChapterId) {
      if (bulkUploadForm.getFieldValue("concept_id")) {
        bulkUploadForm.setFieldValue("concept_id", undefined);
      }
      if ((bulkUploadForm.getFieldValue("exam_ids") || []).length) {
        bulkUploadForm.setFieldValue("exam_ids", []);
      }
      return;
    }

    const validConceptIds = new Set(bulkConceptOptions.map((option) => option.value));
    const currentConceptId = bulkUploadForm.getFieldValue("concept_id");
    if (currentConceptId && !validConceptIds.has(currentConceptId)) {
      bulkUploadForm.setFieldValue("concept_id", undefined);
      bulkUploadForm.setFieldValue("exam_ids", []);
      return;
    }
    if (!currentConceptId && bulkConceptOptions.length === 1) {
      bulkUploadForm.setFieldValue("concept_id", bulkConceptOptions[0].value);
    }
  }, [bulkChapterId, bulkConceptOptions, bulkUploadForm]);

  useEffect(() => {
    const currentConceptId = bulkUploadForm.getFieldValue("concept_id");
    if (!currentConceptId) {
      if ((bulkUploadForm.getFieldValue("exam_ids") || []).length) {
        bulkUploadForm.setFieldValue("exam_ids", []);
      }
      return;
    }

    const validExamIds = new Set(bulkExamOptions.map((option) => option.value));
    const currentExamIds = bulkUploadForm.getFieldValue("exam_ids") || [];
    const filteredExamIds = currentExamIds.filter((examId) => validExamIds.has(examId));
    if (filteredExamIds.length !== currentExamIds.length) {
      bulkUploadForm.setFieldValue("exam_ids", filteredExamIds);
      return;
    }
    if (!filteredExamIds.length && bulkExamOptions.length === 1) {
      bulkUploadForm.setFieldValue("exam_ids", [bulkExamOptions[0].value]);
    }
  }, [bulkConceptId, bulkExamOptions, bulkUploadForm]);

  useEffect(() => {
    const currentExamIds = conceptBulkUploadForm.getFieldValue("exam_ids") || [];
    if (!currentExamIds.length && examOptions.length === 1) {
      conceptBulkUploadForm.setFieldValue("exam_ids", [examOptions[0].value]);
    }
  }, [conceptBulkUploadForm, examOptions]);

  useEffect(() => {
    const selectedExamIds = conceptBulkUploadForm.getFieldValue("exam_ids") || [];
    if (!selectedExamIds.length) {
      if (conceptBulkUploadForm.getFieldValue("subject_id")) {
        conceptBulkUploadForm.setFieldValue("subject_id", undefined);
      }
      if (conceptBulkUploadForm.getFieldValue("chapter_id")) {
        conceptBulkUploadForm.setFieldValue("chapter_id", undefined);
      }
      return;
    }

    const validSubjectIds = new Set(conceptBulkSubjectOptions.map((option) => option.value));
    const currentSubjectId = conceptBulkUploadForm.getFieldValue("subject_id");
    if (currentSubjectId && !validSubjectIds.has(currentSubjectId)) {
      conceptBulkUploadForm.setFieldValue("subject_id", undefined);
      conceptBulkUploadForm.setFieldValue("chapter_id", undefined);
      return;
    }
    if (!currentSubjectId && conceptBulkSubjectOptions.length === 1) {
      conceptBulkUploadForm.setFieldValue("subject_id", conceptBulkSubjectOptions[0].value);
    }
  }, [conceptBulkExamIds, conceptBulkSubjectOptions, conceptBulkUploadForm]);

  useEffect(() => {
    const currentSubjectId = conceptBulkUploadForm.getFieldValue("subject_id");
    if (!currentSubjectId) {
      if (conceptBulkUploadForm.getFieldValue("chapter_id")) {
        conceptBulkUploadForm.setFieldValue("chapter_id", undefined);
      }
      return;
    }

    const validChapterIds = new Set(conceptBulkChapterOptions.map((option) => option.value));
    const currentChapterId = conceptBulkUploadForm.getFieldValue("chapter_id");
    if (currentChapterId && !validChapterIds.has(currentChapterId)) {
      conceptBulkUploadForm.setFieldValue("chapter_id", undefined);
      return;
    }
    if (!currentChapterId && conceptBulkChapterOptions.length === 1) {
      conceptBulkUploadForm.setFieldValue("chapter_id", conceptBulkChapterOptions[0].value);
    }
  }, [conceptBulkChapterOptions, conceptBulkSubjectId, conceptBulkUploadForm]);
  const handleSearchChange = (section, value) => {
    setSearchValues((current) => ({ ...current, [section]: value }));
    setTablePagination((current) => ({
      ...current,
      [section]: {
        ...current[section],
        current: 1,
      },
    }));
  };
  const handleTableChange = (section, pagination) => {
    setTablePagination((current) => ({
      ...current,
      [section]: {
        current: pagination.current,
        pageSize: pagination.pageSize,
      },
    }));
  };
  const matchesSearch = (value, query) => String(value || "").toLowerCase().includes(query.trim().toLowerCase());
  const filteredExams = exams.filter(
    (exam) => !searchValues.exams || matchesSearch(`${exam.name} ${exam.slug}`, searchValues.exams),
  );
  const filteredSubjects = subjects.filter(
    (subject) =>
      !searchValues.subjects ||
      matchesSearch(
        `${subject.name} ${subject.slug} ${(subject.exams || []).map((exam) => exam.name).join(" ")}`,
        searchValues.subjects,
      ),
  );
  const filteredChapters = chapters.filter(
    (chapter) =>
      !searchValues.chapters ||
      matchesSearch(
        `${chapter.name} ${chapter.slug} ${chapter.subject_name} ${(chapter.exams || []).map((exam) => exam.name).join(" ")}`,
        searchValues.chapters,
      ),
  );
  const filteredConcepts = concepts.filter(
    (concept) =>
      !searchValues.concepts ||
      matchesSearch(
        `${concept.name} ${concept.subject_name} ${concept.chapter_name || ""} ${(concept.exams || []).map((exam) => exam.name).join(" ")}`,
        searchValues.concepts,
      ),
  );
  const filteredTemplates = templates.filter(
    (template) =>
      !searchValues.templates ||
      matchesSearch(
        `${template.concept_name} ${template.secondary_concept_name || ""} ${template.template_type} ${template.difficulty} ${template.template_text} ${template.status}`,
        searchValues.templates,
      ),
  );
  const filteredQuestions = questions.filter(
    (question) => {
      if (
        searchValues.questions &&
        !matchesSearch(
          `${question.prompt} ${question.subject_name} ${question.chapter_name || ""} ${question.concept_name} ${question.question_type} ${question.status} ${(question.exams || []).map((exam) => exam.name).join(" ")}`,
          searchValues.questions,
        )
      ) {
        return false;
      }
      if (questionFilters.concept && question.concept !== questionFilters.concept) {
        return false;
      }
      if (questionFilters.templateType && (question.template_type || "") !== questionFilters.templateType) {
        return false;
      }
      if (questionFilters.difficulty && String(question.difficulty_level) !== String(questionFilters.difficulty)) {
        return false;
      }
      if (questionFilters.source && question.generation_source !== questionFilters.source) {
        return false;
      }
      if (questionFilters.status && question.status !== questionFilters.status) {
        return false;
      }
      return true;
    },
  );
  const sectionRecords = {
    exams: filteredExams,
    subjects: filteredSubjects,
    chapters: filteredChapters,
    concepts: filteredConcepts,
    templates: filteredTemplates,
    questions: filteredQuestions,
  };
  const sectionLabels = {
    exams: "exams",
    subjects: "subjects",
    chapters: "chapters",
    concepts: "concepts",
    templates: "templates",
    questions: "questions",
  };
  const buildPaginationProps = (section, total) => ({
    current: tablePagination[section].current,
    pageSize: tablePagination[section].pageSize,
    total,
    showSizeChanger: true,
    pageSizeOptions: ["5", "8", "10", "20"],
    showTotal: (count, range) => `${range[0]}-${range[1]} of ${count}`,
  });
  const handleDeleteAll = (section) => {
    const records = sectionRecords[section];
    if (!records.length) {
      return;
    }
    Modal.confirm({
      title: `Delete ${records.length} ${sectionLabels[section]}?`,
      content:
        searchValues[section]
          ? "This deletes all items in the current filtered result set."
          : "This deletes every item currently loaded in this section.",
      okText: "Delete all",
      okButtonProps: { danger: true, loading: bulkDeletingSection === section },
      cancelText: "Cancel",
      onOk: async () => {
        setBulkDeletingSection(section);
        try {
          for (const record of records) {
            await apiRequest(buildDeletePath(section, record.id), {
              method: "DELETE",
              token,
            });
          }
          messageApi.success(`Deleted ${records.length} ${sectionLabels[section]}.`);
          await loadData();
        } catch (requestError) {
          messageApi.error(requestError.message);
          throw requestError;
        } finally {
          setBulkDeletingSection(null);
        }
      },
    });
  };

  const examColumns = [
    { title: "Name", dataIndex: "name", key: "name", sorter: (left, right) => left.name.localeCompare(right.name) },
    { title: "Slug", dataIndex: "slug", key: "slug", sorter: (left, right) => left.slug.localeCompare(right.slug) },
    { title: "Subjects", dataIndex: "subject_count", key: "subject_count", sorter: (left, right) => left.subject_count - right.subject_count },
    { title: "Chapters", dataIndex: "chapter_count", key: "chapter_count", sorter: (left, right) => left.chapter_count - right.chapter_count },
    { title: "Concepts", dataIndex: "concept_count", key: "concept_count", sorter: (left, right) => left.concept_count - right.concept_count },
    { title: "Questions", dataIndex: "question_count", key: "question_count", sorter: (left, right) => left.question_count - right.question_count },
    {
      title: "Actions",
      key: "actions",
      render: (_, exam) => (
        <Space className="admin-table-actions" size="small">
          <Button type="link" onClick={() => openExamEditor(exam)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete exam?"
            description="Linked subjects, concepts, and questions will lose this exam mapping."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteItem(`/api/admin/exams/${exam.id}`, "Exam deleted.")}
          >
            <Button type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const subjectColumns = [
    { title: "Name", dataIndex: "name", key: "name", sorter: (left, right) => left.name.localeCompare(right.name) },
    { title: "Slug", dataIndex: "slug", key: "slug", sorter: (left, right) => left.slug.localeCompare(right.slug) },
    {
      title: "Exams",
      dataIndex: "exams",
      key: "exams",
      render: formatExamNames,
      sorter: (left, right) => formatExamNames(left.exams).localeCompare(formatExamNames(right.exams)),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, subject) => (
        <Space className="admin-table-actions" size="small">
          <Button type="link" onClick={() => openSubjectEditor(subject)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete subject?"
            description="This also removes its concepts and questions."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteItem(`/api/admin/subjects/${subject.id}`, "Subject deleted.")}
          >
            <Button type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const chapterColumns = [
    { title: "Name", dataIndex: "name", key: "name", sorter: (left, right) => left.name.localeCompare(right.name) },
    { title: "Subject", dataIndex: "subject_name", key: "subject_name", sorter: (left, right) => left.subject_name.localeCompare(right.subject_name) },
    {
      title: "Exams",
      dataIndex: "exams",
      key: "exams",
      render: formatExamNames,
      sorter: (left, right) => formatExamNames(left.exams).localeCompare(formatExamNames(right.exams)),
    },
    { title: "Concepts", dataIndex: "concept_count", key: "concept_count", sorter: (left, right) => left.concept_count - right.concept_count },
    { title: "Questions", dataIndex: "question_count", key: "question_count", sorter: (left, right) => left.question_count - right.question_count },
    {
      title: "Actions",
      key: "actions",
      render: (_, chapter) => (
        <Space className="admin-table-actions" size="small">
          <Button type="link" onClick={() => openChapterEditor(chapter)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete chapter?"
            description="This also removes concepts and questions inside the chapter."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteItem(`/api/admin/chapters/${chapter.id}`, "Chapter deleted.")}
          >
            <Button type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const conceptColumns = [
    { title: "Name", dataIndex: "name", key: "name", sorter: (left, right) => left.name.localeCompare(right.name) },
    { title: "Subject", dataIndex: "subject_name", key: "subject_name", sorter: (left, right) => left.subject_name.localeCompare(right.subject_name) },
    { title: "Chapter", dataIndex: "chapter_name", key: "chapter_name", sorter: (left, right) => (left.chapter_name || "").localeCompare(right.chapter_name || "") },
    {
      title: "Exams",
      dataIndex: "exams",
      key: "exams",
      render: formatExamNames,
      sorter: (left, right) => formatExamNames(left.exams).localeCompare(formatExamNames(right.exams)),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, concept) => (
        <Space className="admin-table-actions" size="small">
          <Button type="link" onClick={() => openConceptEditor(concept)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete concept?"
            description="This also removes questions linked to the concept."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteItem(`/api/admin/concepts/${concept.id}`, "Concept deleted.")}
          >
            <Button type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const templateColumns = [
    { title: "Concept", dataIndex: "concept_name", key: "concept_name", sorter: (left, right) => left.concept_name.localeCompare(right.concept_name) },
    {
      title: "Template type",
      dataIndex: "template_type",
      key: "template_type",
      render: (value) => <Tag>{value}</Tag>,
      sorter: (left, right) => left.template_type.localeCompare(right.template_type),
    },
    {
      title: "Difficulty",
      dataIndex: "difficulty",
      key: "difficulty",
      render: (value) => <Tag>{value}</Tag>,
      sorter: (left, right) => left.difficulty.localeCompare(right.difficulty),
    },
    { title: "Template text", dataIndex: "template_text", key: "template_text", ellipsis: true },
    { title: "Status", dataIndex: "status", key: "status", render: (value) => <Tag>{value}</Tag> },
    {
      title: "Actions",
      key: "actions",
      render: (_, template) => (
        <Space className="admin-table-actions" size="small">
          <Button type="link" onClick={() => openTemplateEditor(template)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete template?"
            description="Generated question references will keep their saved question data."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteItem(`/api/admin/templates/${template.id}`, "Template deleted.")}
          >
            <Button type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const questionColumns = [
    { title: "Prompt", dataIndex: "prompt", key: "prompt", ellipsis: true, sorter: (left, right) => left.prompt.localeCompare(right.prompt) },
    {
      title: "Exams",
      dataIndex: "exams",
      key: "exams",
      render: formatExamNames,
      sorter: (left, right) => formatExamNames(left.exams).localeCompare(formatExamNames(right.exams)),
    },
    { title: "Subject", dataIndex: "subject_name", key: "subject_name", sorter: (left, right) => left.subject_name.localeCompare(right.subject_name) },
    { title: "Chapter", dataIndex: "chapter_name", key: "chapter_name", sorter: (left, right) => (left.chapter_name || "").localeCompare(right.chapter_name || "") },
    { title: "Concept", dataIndex: "concept_name", key: "concept_name", sorter: (left, right) => left.concept_name.localeCompare(right.concept_name) },
    { title: "Template type", dataIndex: "template_type", key: "template_type", render: (value) => (value ? <Tag>{value}</Tag> : "Manual") },
    { title: "Type", dataIndex: "question_type", key: "question_type", sorter: (left, right) => left.question_type.localeCompare(right.question_type) },
    { title: "Difficulty", dataIndex: "difficulty_level", key: "difficulty_level", render: (value) => <Tag>{`L${value}`}</Tag> },
    { title: "Source", dataIndex: "generation_source", key: "generation_source", render: (value) => <Tag>{value}</Tag> },
    { title: "Status", dataIndex: "status", key: "status", render: (value) => <Tag>{value}</Tag>, sorter: (left, right) => left.status.localeCompare(right.status) },
    {
      title: "Actions",
      key: "actions",
      render: (_, question) => (
        <Space className="admin-table-actions" size="small">
          <Button type="link" onClick={() => openQuestionEditor(question)}>
            Edit
          </Button>
          {question.status === "draft" ? (
            <Button
              type="link"
              onClick={() =>
                handleBulkQuestionStatusUpdate([question], "active", "Question published.")
              }
            >
              Publish
            </Button>
          ) : (
            <Button
              type="link"
              onClick={() =>
                handleBulkQuestionStatusUpdate([question], "draft", "Question moved to draft.")
              }
            >
              Make draft
            </Button>
          )}
          <Popconfirm
            title="Delete question?"
            description="This will remove the question and its options."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteItem(`/api/admin/questions/${question.id}`, "Question deleted.")}
          >
            <Button type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      {contextHolder}
      <div className="admin-content-shell">
        <aside className="admin-content-sidebar panel">
          <span className="admin-content-sidebar-label">Sections</span>
          <nav className="admin-content-sidebar-nav">
            <button
              type="button"
              className={`admin-content-sidebar-link${activeSection === "exams" ? " is-active" : ""}`}
              onClick={() => setActiveSection("exams")}
            >
              Exams
            </button>
            <button
              type="button"
              className={`admin-content-sidebar-link${activeSection === "subjects" ? " is-active" : ""}`}
              onClick={() => setActiveSection("subjects")}
            >
              Subjects
            </button>
            <button
              type="button"
              className={`admin-content-sidebar-link${activeSection === "chapters" ? " is-active" : ""}`}
              onClick={() => setActiveSection("chapters")}
            >
              Chapters
            </button>
            <button
              type="button"
              className={`admin-content-sidebar-link${activeSection === "concepts" ? " is-active" : ""}`}
              onClick={() => setActiveSection("concepts")}
            >
              Concepts
            </button>
            <button
              type="button"
              className={`admin-content-sidebar-link${activeSection === "templates" ? " is-active" : ""}`}
              onClick={() => setActiveSection("templates")}
            >
              Templates
            </button>
            <button
              type="button"
              className={`admin-content-sidebar-link${activeSection === "questions" ? " is-active" : ""}`}
              onClick={() => setActiveSection("questions")}
            >
              Question bank
            </button>
          </nav>
        </aside>

        <div className="admin-content-main">
          {activeSection === "exams" ? (
            <section className="admin-content-section">
              <Card
                title="Exams"
                extra={
                  <Space wrap>
                    <Input.Search
                      placeholder="Search exams"
                      allowClear
                      value={searchValues.exams}
                      onChange={(event) => handleSearchChange("exams", event.target.value)}
                      className="admin-table-search"
                    />
                    <Button
                      danger
                      onClick={() => handleDeleteAll("exams")}
                      disabled={!filteredExams.length}
                      loading={bulkDeletingSection === "exams"}
                    >
                      Delete all
                    </Button>
                    <Button onClick={() => openExamEditor()}>New exam</Button>
                  </Space>
                }
                className="admin-card"
              >
                <Table
                  rowKey="id"
                  columns={examColumns}
                  dataSource={filteredExams}
                  loading={loading}
                  pagination={buildPaginationProps("exams", filteredExams.length)}
                  onChange={(pagination) => handleTableChange("exams", pagination)}
                />
              </Card>
            </section>
          ) : null}

          {activeSection === "subjects" ? (
            <section className="admin-content-section">
              <Card
                title="Subjects"
                extra={
                  <Space wrap>
                    <Input.Search
                      placeholder="Search subjects"
                      allowClear
                      value={searchValues.subjects}
                      onChange={(event) => handleSearchChange("subjects", event.target.value)}
                      className="admin-table-search"
                    />
                    <Button
                      danger
                      onClick={() => handleDeleteAll("subjects")}
                      disabled={!filteredSubjects.length}
                      loading={bulkDeletingSection === "subjects"}
                    >
                      Delete all
                    </Button>
                    <Button onClick={() => openSubjectEditor()}>New subject</Button>
                  </Space>
                }
                className="admin-card"
              >
                <Table
                  rowKey="id"
                  columns={subjectColumns}
                  dataSource={filteredSubjects}
                  loading={loading}
                  pagination={buildPaginationProps("subjects", filteredSubjects.length)}
                  onChange={(pagination) => handleTableChange("subjects", pagination)}
                />
              </Card>
            </section>
          ) : null}

          {activeSection === "chapters" ? (
            <section className="admin-content-section">
              <Card
                title="Chapters"
                extra={
                  <Space wrap>
                    <Input.Search
                      placeholder="Search chapters"
                      allowClear
                      value={searchValues.chapters}
                      onChange={(event) => handleSearchChange("chapters", event.target.value)}
                      className="admin-table-search"
                    />
                    <Button
                      danger
                      onClick={() => handleDeleteAll("chapters")}
                      disabled={!filteredChapters.length}
                      loading={bulkDeletingSection === "chapters"}
                    >
                      Delete all
                    </Button>
                    <Button onClick={() => setChapterBulkUploadOpen(true)}>Bulk upload</Button>
                    <Button onClick={() => openChapterEditor()}>New chapter</Button>
                  </Space>
                }
                className="admin-card"
              >
                <Table
                  rowKey="id"
                  columns={chapterColumns}
                  dataSource={filteredChapters}
                  loading={loading}
                  pagination={buildPaginationProps("chapters", filteredChapters.length)}
                  onChange={(pagination) => handleTableChange("chapters", pagination)}
                />
              </Card>
            </section>
          ) : null}

          {activeSection === "concepts" ? (
            <section className="admin-content-section">
              <Card
                title="Concepts"
                extra={
                  <Space wrap>
                    <Input.Search
                      placeholder="Search concepts"
                      allowClear
                      value={searchValues.concepts}
                      onChange={(event) => handleSearchChange("concepts", event.target.value)}
                      className="admin-table-search"
                    />
                    <Button
                      danger
                      onClick={() => handleDeleteAll("concepts")}
                      disabled={!filteredConcepts.length}
                      loading={bulkDeletingSection === "concepts"}
                    >
                      Delete all
                    </Button>
                    <Button onClick={() => setConceptBulkUploadOpen(true)}>Bulk upload</Button>
                    <Button onClick={() => openConceptEditor()}>New concept</Button>
                  </Space>
                }
                className="admin-card"
              >
                <Table
                  rowKey="id"
                  columns={conceptColumns}
                  dataSource={filteredConcepts}
                  loading={loading}
                  pagination={buildPaginationProps("concepts", filteredConcepts.length)}
                  onChange={(pagination) => handleTableChange("concepts", pagination)}
                />
              </Card>
            </section>
          ) : null}

          {activeSection === "templates" ? (
            <section className="admin-content-section">
              <Card
                title="Templates"
                extra={
                  <Space wrap>
                    <Input.Search
                      placeholder="Search templates"
                      allowClear
                      value={searchValues.templates}
                      onChange={(event) => handleSearchChange("templates", event.target.value)}
                      className="admin-table-search"
                    />
                    <Button onClick={() => setTemplateJsonImportOpen(true)}>Upload JSON</Button>
                    <Button onClick={() => openTemplateEditor()}>New template</Button>
                  </Space>
                }
                className="admin-card"
              >
                <Table
                  rowKey="id"
                  columns={templateColumns}
                  dataSource={filteredTemplates}
                  loading={loading}
                  pagination={buildPaginationProps("templates", filteredTemplates.length)}
                  onChange={(pagination) => handleTableChange("templates", pagination)}
                  scroll={{ x: 1100 }}
                />
              </Card>
            </section>
          ) : null}

          {activeSection === "questions" ? (
            <section className="admin-content-section">
              <Card
                title="Question bank"
                extra={
                  <Space wrap>
                    <Input.Search
                      placeholder="Search questions"
                      allowClear
                      value={searchValues.questions}
                      onChange={(event) => handleSearchChange("questions", event.target.value)}
                      className="admin-table-search"
                    />
                    <Button
                      danger
                      onClick={() => handleDeleteAll("questions")}
                      disabled={!filteredQuestions.length}
                      loading={bulkDeletingSection === "questions"}
                    >
                      Delete all
                    </Button>
                    <Button
                      onClick={() =>
                        handleBulkQuestionStatusUpdate(
                          filteredQuestions.filter((question) => question.status === "draft"),
                          "active",
                          "Draft questions published.",
                        )
                      }
                      disabled={!filteredQuestions.some((question) => question.status === "draft")}
                      loading={saving}
                    >
                      Publish drafts
                    </Button>
                    <Button onClick={() => setQuestionJsonImportOpen(true)}>Upload JSON file</Button>
                    <Button onClick={() => setBulkUploadOpen(true)}>Bulk upload</Button>
                    <Button type="primary" onClick={() => setGeneratorOpen(true)}>Generate Questions</Button>
                  </Space>
                }
                className="admin-card"
              >
                <Row gutter={12} className="admin-question-filter-row">
                  <Col xs={24} md={4}>
                    <Select
                      allowClear
                      placeholder="Filter by concept"
                      options={conceptOptions}
                      value={questionFilters.concept || undefined}
                      onChange={(value) => setQuestionFilters((current) => ({ ...current, concept: value || "" }))}
                    />
                  </Col>
                  <Col xs={24} md={5}>
                    <Select
                      allowClear
                      placeholder="Filter by template type"
                      options={[
                        { label: "Logic", value: "logic" },
                        { label: "Word", value: "word" },
                        { label: "Multi-concept", value: "multi_concept" },
                      ]}
                      value={questionFilters.templateType || undefined}
                      onChange={(value) => setQuestionFilters((current) => ({ ...current, templateType: value || "" }))}
                    />
                  </Col>
                  <Col xs={24} md={5}>
                    <Select
                      allowClear
                      placeholder="Filter by difficulty"
                      options={[
                        { label: "Easy", value: 1 },
                        { label: "Medium", value: 3 },
                        { label: "Hard", value: 5 },
                      ]}
                      value={questionFilters.difficulty || undefined}
                      onChange={(value) => setQuestionFilters((current) => ({ ...current, difficulty: value || "" }))}
                    />
                  </Col>
                  <Col xs={24} md={5}>
                    <Select
                      allowClear
                      placeholder="Filter by source"
                      options={[
                        { label: "Generated", value: "generated" },
                        { label: "Manual", value: "manual" },
                      ]}
                      value={questionFilters.source || undefined}
                      onChange={(value) => setQuestionFilters((current) => ({ ...current, source: value || "" }))}
                    />
                  </Col>
                  <Col xs={24} md={5}>
                    <Select
                      allowClear
                      placeholder="Filter by status"
                      options={[
                        { label: "Draft", value: "draft" },
                        { label: "Active", value: "active" },
                        { label: "Archived", value: "archived" },
                      ]}
                      value={questionFilters.status || undefined}
                      onChange={(value) => setQuestionFilters((current) => ({ ...current, status: value || "" }))}
                    />
                  </Col>
                </Row>
                <Table
                  rowKey="id"
                  columns={questionColumns}
                  dataSource={filteredQuestions}
                  loading={loading}
                  pagination={buildPaginationProps("questions", filteredQuestions.length)}
                  onChange={(pagination) => handleTableChange("questions", pagination)}
                  scroll={{ x: 1550 }}
                />
              </Card>
            </section>
          ) : null}
        </div>
      </div>

      <Modal
        title={editingExam ? "Edit exam" : "Create exam"}
        open={examOpen}
        onCancel={handleExamModalClose}
        onOk={handleExamSubmit}
        confirmLoading={saving}
      >
        <Form form={examForm} layout="vertical" initialValues={{ name: "" }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Slug">
            <Input value="Auto-generated from exam name" disabled />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingSubject ? "Edit subject" : "Create subject"}
        open={subjectOpen}
        onCancel={handleSubjectModalClose}
        onOk={handleSubjectSubmit}
        confirmLoading={saving}
      >
        <Form form={subjectForm} layout="vertical" initialValues={{ name: "" }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="exam_ids" label="Linked exams">
            <Select mode="multiple" allowClear options={examOptions} />
          </Form.Item>
          <Form.Item label="Slug">
            <Input value="Auto-generated from subject name" disabled />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingChapter ? "Edit chapter" : "Create chapter"}
        open={chapterOpen}
        onCancel={handleChapterModalClose}
        onOk={handleChapterSubmit}
        confirmLoading={saving}
      >
        <Form form={chapterForm} layout="vertical" initialValues={{ name: "" }}>
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Select options={subjectOptions} />
          </Form.Item>
          <Form.Item name="exam_ids" label="Linked exams">
            <Select mode="multiple" allowClear options={examOptions} />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Slug">
            <Input value="Auto-generated from chapter name" disabled />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Bulk upload chapters"
        open={chapterBulkUploadOpen}
        onCancel={handleChapterBulkUploadClose}
        onOk={handleChapterBulkUploadSubmit}
        confirmLoading={saving}
        width={760}
      >
        <Form
          form={chapterBulkUploadForm}
          layout="vertical"
          initialValues={{
            exam_ids: [],
            chapters_text: "Chapter 1\nChapter 2\nChapter 3",
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="subject_id" label="Subject" rules={[{ required: true }]}>
                <Select
                  showSearch
                  options={subjectOptions}
                  optionFilterProp="label"
                  onChange={() => chapterBulkUploadForm.setFieldValue("exam_ids", [])}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="exam_ids" label="Linked exams" rules={[{ required: true, message: "Select at least one linked exam." }]}>
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={chapterBulkExamOptions}
                  disabled={!chapterBulkSubjectId}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="chapters_text"
            label="Chapter names"
            extra="Paste one chapter per line. Existing chapters in the same subject will be skipped automatically."
            rules={[
              { required: true },
              {
                validator: (_, value) => {
                  const items = String(value || "")
                    .split(/\r?\n/)
                    .map((item) => item.trim())
                    .filter(Boolean);
                  if (!items.length) {
                    return Promise.reject(new Error("Enter at least one chapter name."));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input.TextArea rows={14} className="admin-json-editor" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Bulk upload concepts"
        open={conceptBulkUploadOpen}
        onCancel={handleConceptBulkUploadClose}
        onOk={handleConceptBulkUploadSubmit}
        confirmLoading={saving}
        width={760}
      >
        <Form
          form={conceptBulkUploadForm}
          layout="vertical"
          initialValues={{
            concepts_text: "Concept 1\nConcept 2\nConcept 3",
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="exam_ids" label="Linked exams" rules={[{ required: true, message: "Select at least one linked exam." }]}>
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={examOptions}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="subject_id" label="Subject" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={conceptBulkSubjectOptions}
                  disabled={!conceptBulkExamIds?.length}
                  onChange={() => {
                    conceptBulkUploadForm.setFieldValue("chapter_id", undefined);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="chapter_id" label="Chapter" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={conceptBulkChapterOptions}
                  disabled={!conceptBulkSubjectId}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="concepts_text"
            label="Concept names"
            extra="Paste one concept per line. Existing concepts in the same chapter will be skipped automatically."
            rules={[
              { required: true },
              {
                validator: (_, value) => {
                  const items = String(value || "")
                    .split(/\r?\n/)
                    .map((item) => item.trim())
                    .filter(Boolean);
                  if (!items.length) {
                    return Promise.reject(new Error("Enter at least one concept name."));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input.TextArea rows={14} className="admin-json-editor" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Import question bank JSON"
        open={questionJsonImportOpen}
        onCancel={handleQuestionJsonImportClose}
        onOk={handleQuestionJsonImportSubmit}
        confirmLoading={saving}
        width={860}
      >
        <Form form={questionJsonImportForm} layout="vertical">
          <Form.Item
            name="import_file"
            label="JSON file"
            valuePropName="fileList"
            getValueFromEvent={(event) => (Array.isArray(event) ? event : event?.fileList)}
            rules={[{ required: true, message: "Upload a JSON file." }]}
            extra="One file should contain one subject, one chapter, the related exams, the concept list, and all questions."
          >
            <Upload
              accept=".json,application/json"
              beforeUpload={() => false}
              maxCount={1}
            >
              <Button>Select JSON file</Button>
            </Upload>
          </Form.Item>
          <Form.Item label="Expected JSON shape">
            <Input.TextArea
              className="admin-json-editor"
              rows={16}
              readOnly
              value={JSON.stringify(
                {
                  subject_name: "Math",
                  chapter_name: "3D Geometry",
                  exam_names: ["JEE Main", "JEE Advanced"],
                  concept_names: ["Lines in 3D", "Planes"],
                  questions: [
                    {
                      concept_name: "Lines in 3D",
                      question_type: "mcq_single",
                      prompt: "Which vector is parallel to the line?",
                      explanation: "Use the direction ratios.",
                      difficulty_level: 2,
                      status: "draft",
                      options: [
                        { option_text: "Option A", is_correct: true, display_order: 1 },
                        { option_text: "Option B", is_correct: false, display_order: 2 },
                      ],
                    },
                  ],
                },
                null,
                2,
              )}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Bulk upload questions"
        open={bulkUploadOpen}
        onCancel={handleBulkUploadClose}
        onOk={handleBulkUploadSubmit}
        confirmLoading={saving}
        width={820}
      >
        <Form
          form={bulkUploadForm}
          layout="vertical"
          initialValues={{
            exam_ids: [],
            questions_json: JSON.stringify(
              [
                {
                  question_type: "mcq_single",
                  prompt: "Sample question prompt",
                  explanation: "Short explanation",
                  difficulty_level: 1,
                  status: "draft",
                  options: [
                    { option_text: "Option A", is_correct: true, display_order: 1 },
                    { option_text: "Option B", is_correct: false, display_order: 2 },
                  ],
                },
              ],
              null,
              2,
            ),
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item name="subject_id" label="Subject" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={subjectOptions}
                  onChange={() => {
                    bulkUploadForm.setFieldValue("chapter_id", undefined);
                    bulkUploadForm.setFieldValue("concept_id", undefined);
                    bulkUploadForm.setFieldValue("exam_ids", []);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="chapter_id" label="Chapter" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={bulkChapterOptions}
                  disabled={!bulkSubjectId}
                  onChange={() => {
                    bulkUploadForm.setFieldValue("concept_id", undefined);
                    bulkUploadForm.setFieldValue("exam_ids", []);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="concept_id" label="Concept" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={bulkConceptOptions}
                  disabled={!bulkChapterId}
                  onChange={() => bulkUploadForm.setFieldValue("exam_ids", [])}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="exam_ids"
                label="Exams for this upload"
                rules={[{ required: true, message: "Select at least one exam for this upload." }]}
              >
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={bulkExamOptions}
                  disabled={!bulkConceptId}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="questions_json"
            label="Questions JSON"
            extra="Provide an array of question objects. Each item can include question_type, prompt, explanation, difficulty_level, status, and options. Exam links will use the selection above unless overridden per item."
            rules={[
              { required: true },
              {
                validator: (_, value) => {
                  try {
                    const parsed = JSON.parse(value);
                    if (!Array.isArray(parsed)) {
                      return Promise.reject(new Error("Questions JSON must be an array."));
                    }
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error("Enter valid JSON."));
                  }
                },
              },
            ]}
          >
            <Input.TextArea rows={16} className="admin-json-editor" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingTemplate ? "Edit template" : "Create template"}
        open={templateOpen}
        onCancel={handleTemplateModalClose}
        onOk={handleTemplateSubmit}
        confirmLoading={saving}
        width={900}
      >
        <Form
          form={templateForm}
          layout="vertical"
          initialValues={{
            pattern_key: "inclusion_exclusion",
            question_type: "mcq_single",
            difficulty_level: 3,
            status: "draft",
            x_min: 20,
            x_max: 60,
            y_min: 15,
            y_max: 70,
            z_min: 5,
            z_max: 25,
          }}
          onValuesChange={(_, allValues) => {
            const nextPatternKey = allValues.pattern_key || "inclusion_exclusion";
            setTemplatePatternKey(nextPatternKey);
            syncTemplatePreview(allValues);
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="concept" label="Concept" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label" options={conceptOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="question_type" label="Question type" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: "Single Correct MCQ", value: "mcq_single" },
                    { label: "Numeric", value: "numeric" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="pattern_key" label="Pattern" rules={[{ required: true }]}>
                <Select
                  options={Object.entries(TEMPLATE_PATTERN_LIBRARY).map(([value, pattern]) => ({
                    label: pattern.label,
                    value,
                  }))}
                  onChange={(value) => {
                    const pattern = TEMPLATE_PATTERN_LIBRARY[value];
                    setTemplatePatternKey(value);
                    templateForm.setFieldsValue(
                      Object.fromEntries(
                        pattern.fields.map((field) => [`${field.key}_${field.rangeKey}`, field.defaultValue]),
                      ),
                    );
                    if (pattern.defaultQuestionType) {
                      templateForm.setFieldValue("question_type", pattern.defaultQuestionType);
                    }
                    syncTemplatePreview({
                      ...templateForm.getFieldsValue(true),
                      pattern_key: value,
                      question_type: pattern.defaultQuestionType,
                      ...Object.fromEntries(pattern.fields.map((field) => [`${field.key}_${field.rangeKey}`, field.defaultValue])),
                    });
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="secondary_concept" label="Secondary concept">
                <Select showSearch allowClear optionFilterProp="label" options={conceptOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={18}>
              <Form.Item name="difficulty_level" label="Difficulty" rules={[{ required: true }]}>
                <Slider min={1} max={5} step={1} marks={TEMPLATE_DIFFICULTY_MARKS} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Select options={[{ label: "Draft", value: "draft" }, { label: "Active", value: "active" }]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            {TEMPLATE_PATTERN_LIBRARY[templatePatternKey].fields.map((field) => (
              <Col xs={24} md={12} key={`${templatePatternKey}-${field.key}-${field.rangeKey}`}>
                <Form.Item
                  name={`${field.key}_${field.rangeKey}`}
                  label={field.label}
                  rules={[{ required: true, message: `Enter ${field.label.toLowerCase()}.` }]}
                >
                  <InputNumber min={0} step={1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            ))}
          </Row>
          <Form.Item label="Preview">
            <div className="admin-template-preview">
              <strong>Instant question preview</strong>
              <p>{templatePreviewText || "Choose a pattern and fill the value ranges to preview the question."}</p>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Import templates JSON"
        open={templateJsonImportOpen}
        onCancel={handleTemplateJsonImportClose}
        onOk={handleTemplateJsonImportSubmit}
        confirmLoading={saving}
        width={980}
      >
        <Form form={templateJsonImportForm} layout="vertical">
          <Row gutter={20} className="admin-template-json-layout">
            <Col xs={24} lg={12}>
              <Form.Item
                name="import_file"
                label="JSON file"
                valuePropName="fileList"
                getValueFromEvent={(event) => (Array.isArray(event) ? event : event?.fileList)}
                extra="Optional if you paste JSON below. One file can import one subject, one chapter, all related exams, concepts, and templates for that chapter."
              >
                <Upload accept=".json,application/json" beforeUpload={() => false} maxCount={1}>
                  <Button>Select JSON file</Button>
                </Upload>
              </Form.Item>
              <Form.Item
                name="json_text"
                label="Or paste JSON"
                extra="Paste the full template JSON here if you do not want to upload a file."
              >
                <Input.TextArea className="admin-json-editor" rows={14} placeholder='{\n  "subject_name": "Math"\n}' />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="Expected JSON shape">
                <Input.TextArea
                  className="admin-json-editor admin-json-reference"
                  rows={14}
                  readOnly
                  value={JSON.stringify(
                    {
                      subject_name: "string",
                      chapter_name: "string",
                      exam_names: ["JEE Main", "JEE Advanced"],
                      concept_names: ["string"],
                      templates: [
                        {
                          concept_name: "string",
                          secondary_concept_name: null,
                          question_type: "mcq_single",
                          template_type: "logic",
                          difficulty: "medium",
                          template_text: "string with variables {x}, {y}",
                          variables: {
                            x: {
                              min: 1,
                              max: 10,
                              integer_only: true,
                              allow_zero: true,
                              allow_negative: false,
                            },
                          },
                          constraints: ["string"],
                          answer_formula: "string",
                          distractor_logic: ["string"],
                          jee_tags: ["string"],
                          expected_time_sec: 60,
                          status: "active",
                        }
                      ],
                    },
                    null,
                    2,
                  )}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Generate questions"
        open={generatorOpen}
        onCancel={handleGeneratorClose}
        onOk={handleGeneratorSubmit}
        okText="Generate preview"
        confirmLoading={saving}
        width={920}
      >
        <Form form={generatorForm} layout="vertical" initialValues={{ difficulty: "medium", count: 5 }}>
          <div className="admin-generator-shell">
            <div className="admin-generator-form">
              <div className="admin-generator-step">Step 1. Choose the content path</div>
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="subject_id" label="Subject" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Select subject"
                      options={subjectOptions}
                      onChange={() => {
                        generatorForm.setFieldValue("chapter_id", undefined);
                        generatorForm.setFieldValue("concept_id", undefined);
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="chapter_id" label="Chapter" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Select chapter"
                      options={generatorChapterOptions}
                      disabled={!generatorSubjectId}
                      onChange={() => generatorForm.setFieldValue("concept_id", undefined)}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="concept_id" label="Concept" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Select concept"
                      options={generatorConceptOptions}
                      disabled={!generatorChapterId}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <div className="admin-generator-step">Step 2. Choose generation level</div>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="difficulty" label="Difficulty" rules={[{ required: true }]}>
                    <Select
                      options={[{ label: "Easy", value: "easy" }, { label: "Medium", value: "medium" }, { label: "Hard", value: "hard" }]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="count" label="Number of questions" rules={[{ required: true }]}>
                    <Select options={[3, 5, 10, 15, 20].map((value) => ({ label: `${value}`, value }))} />
                  </Form.Item>
                </Col>
              </Row>
            </div>
            <div className="admin-generator-summary">
              <div className="admin-generator-summary-card">
                <strong>Generation summary</strong>
                <div className="admin-generator-summary-list">
                  <div>
                    <span>Subject</span>
                    <b>{selectedGeneratorSubject?.name || "Not selected"}</b>
                  </div>
                  <div>
                    <span>Chapter</span>
                    <b>{selectedGeneratorChapter?.name || "Not selected"}</b>
                  </div>
                  <div>
                    <span>Concept</span>
                    <b>{selectedGeneratorConcept?.name || "Not selected"}</b>
                  </div>
                  <div>
                    <span>Difficulty</span>
                    <b>{generatorDifficultyValue}</b>
                  </div>
                  <div>
                    <span>Count</span>
                    <b>{generatorCountValue}</b>
                  </div>
                  <div>
                    <span>Active templates</span>
                    <b>{matchingGeneratorTemplates.length}</b>
                  </div>
                </div>
                <div className="admin-generator-summary-tags">
                  {matchingGeneratorTemplateTypes.length ? (
                    matchingGeneratorTemplateTypes.map((type) => <Tag key={type}>{type}</Tag>)
                  ) : (
                    <Tag color="default">No active templates yet</Tag>
                  )}
                </div>
                <p className="admin-generator-summary-note">
                  {generatorConceptId
                    ? matchingGeneratorTemplates.length
                      ? "Preview will use the active templates for this concept and difficulty."
                      : "No active templates match this concept and difficulty yet."
                    : "Choose subject, chapter, and concept to see which templates will be used."}
                </p>
              </div>
            </div>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Review generated questions"
        open={previewOpen}
        onCancel={handlePreviewClose}
        onOk={handleApproveGeneratedQuestions}
        okText="Approve and save"
        confirmLoading={saving}
        width={980}
      >
        <div className="admin-generated-preview-list">
          {generatedPreviewQuestions.map((question, index) => (
            <Card
              key={question.generation_hash}
              size="small"
              className="admin-generated-preview-card"
              title={`Preview ${index + 1}`}
              extra={<Button danger type="link" onClick={() => setGeneratedPreviewQuestions((current) => current.filter((item) => item.generation_hash !== question.generation_hash))}>Reject</Button>}
            >
              <div className="admin-generated-preview-copy">
                <strong>{question.prompt}</strong>
                <span>{question.explanation}</span>
              </div>
              <div className="admin-generated-preview-tags">
                <Tag>{`Difficulty ${question.difficulty_level}`}</Tag>
                <Tag>{question.question_type}</Tag>
              </div>
              <div className="admin-generated-preview-options">
                {(question.options || []).map((option) => (
                  <div key={`${question.generation_hash}-${option.display_order}`} className={`admin-generated-preview-option${option.is_correct ? " is-correct" : ""}`}>
                    <span>{option.option_text}</span>
                    {option.is_correct ? <Tag color="green">Answer</Tag> : null}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Modal>

      <Modal
        title={editingConcept ? "Edit concept" : "Create concept"}
        open={conceptOpen}
        onCancel={handleConceptModalClose}
        onOk={handleConceptSubmit}
        confirmLoading={saving}
      >
        <Form form={conceptForm} layout="vertical">
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Select
              options={subjectOptions}
              onChange={() => conceptForm.setFieldValue("chapter", undefined)}
            />
          </Form.Item>
          <Form.Item name="chapter" label="Chapter" rules={[{ required: true }]}>
            <Select
              options={
                conceptFormSubjectId
                  ? chapterOptions.filter(
                      (chapter) => chapters.find((item) => item.id === chapter.value)?.subject === conceptFormSubjectId,
                    )
                  : chapterOptions
              }
            />
          </Form.Item>
          <Form.Item name="exam_ids" label="Linked exams">
            <Select mode="multiple" allowClear options={examOptions} />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Slug">
            <Input value="Auto-generated from concept name" disabled />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingQuestion ? "Edit question" : "Create question"}
        open={questionOpen}
        onCancel={handleQuestionModalClose}
        footer={[
          <Button key="cancel" onClick={handleQuestionModalClose}>
            Cancel
          </Button>,
          questionStep > 0 ? (
            <Button key="back" onClick={() => setQuestionStep(0)}>
              Back
            </Button>
          ) : null,
          questionStep === 0 ? (
            <Button key="next" type="primary" onClick={handleQuestionNext}>
              Next
            </Button>
          ) : (
            <Button key="submit" type="primary" loading={saving} onClick={handleQuestionSubmit}>
              Create question
            </Button>
          ),
        ]}
        width={1080}
        className="admin-question-modal"
      >
        <Form
          form={questionForm}
          layout="vertical"
          initialValues={{
            exam_ids: [],
            exam_type: [],
            question_type: "mcq_single",
            difficulty_level: 1,
            status: "active",
            options: [
              { option_text: "", is_correct: false, display_order: 1 },
              { option_text: "", is_correct: true, display_order: 2 },
            ],
          }}
        >
          <div className="admin-question-steps">
            <Steps
              current={questionStep}
              size="small"
              items={[
                { title: "Question details" },
                { title: questionType === "numeric" ? "Answer mode" : "Answer options" },
              ]}
            />
          </div>

          {questionStep === 0 ? (
            <div className="admin-question-layout admin-question-layout-details">
              <div className="admin-question-main">
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="exam_ids" label="Exams" rules={[{ required: true, type: "array", min: 1 }]}>
                      <Select
                        mode="multiple"
                        allowClear
                        options={examOptions}
                        onChange={() => {
                          questionForm.setFieldValue("subject_id", undefined);
                          questionForm.setFieldValue("chapter_id", undefined);
                          questionForm.setFieldValue("concept_id", undefined);
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="question_type" label="Question type" rules={[{ required: true }]}>
                      <Select
                        options={[
                          { label: "Single correct MCQ", value: "mcq_single" },
                          { label: "Multiple correct MCQ", value: "mcq_multi" },
                          { label: "Numeric", value: "numeric" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="subject_id" label="Subject" rules={[{ required: true }]}>
                      <Select
                        options={questionSubjectOptions}
                        disabled={!questionExamIds?.length}
                        onChange={() => {
                          questionForm.setFieldValue("chapter_id", undefined);
                          questionForm.setFieldValue("concept_id", undefined);
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="chapter_id" label="Chapter" rules={[{ required: true }]}>
                      <Select
                        options={questionChapterOptions}
                        disabled={!questionExamIds?.length || !questionSubjectId}
                        onChange={() => {
                          questionForm.setFieldValue("concept_id", undefined);
                        }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="concept_id" label="Concept" rules={[{ required: true }]}>
                      <Select options={questionConceptOptions} disabled={!questionExamIds?.length || !questionSubjectId || !questionChapterId} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="prompt" label="Prompt" rules={[{ required: true }]}>
                  <Input.TextArea rows={5} />
                </Form.Item>
                <Form.Item name="explanation" label="Explanation">
                  <Input.TextArea rows={4} />
                </Form.Item>
              </div>
              <div className="admin-question-side">
                <Card size="small" title="Settings" className="admin-question-side-card">
                  <Form.Item name="difficulty_level" label="Difficulty">
                    <Select options={[1, 2, 3, 4, 5].map((value) => ({ label: `Level ${value}`, value }))} />
                  </Form.Item>
                  <Form.Item name="status" label="Status">
                    <Select
                      options={[
                        { label: "Draft", value: "draft" },
                        { label: "Active", value: "active" },
                        { label: "Archived", value: "archived" },
                      ]}
                    />
                  </Form.Item>
                </Card>
              </div>
            </div>
          ) : (
            <div className="admin-question-layout admin-question-layout-options">
              <div className="admin-question-main">
                {questionType !== "numeric" ? (
                  <Card size="small" title="Answer options" className="admin-question-side-card">
                    <Form.List name="options">
                      {(fields, { add, remove }) => (
                        <Space direction="vertical" className="admin-stack-fill" size="middle">
                          <div className="admin-option-toolbar">
                            <span>Add as many answer choices as needed.</span>
                            <Button
                              type="primary"
                              ghost
                              onClick={() => {
                                add({
                                  option_text: "",
                                  is_correct: false,
                                  display_order: fields.length + 1,
                                });
                              }}
                            >
                              Add option
                            </Button>
                          </div>
                          {fields.map((field, index) => (
                            <div key={field.key} className="admin-option-row">
                              <div className="admin-option-header">
                                <span>Option {index + 1}</span>
                                <Button
                                  type="link"
                                  danger
                                  disabled={fields.length <= 2}
                                  onClick={() => {
                                    remove(field.name);
                                    setTimeout(syncOptionOrder, 0);
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                              <Form.Item
                                name={[field.name, "option_text"]}
                                label="Text"
                                rules={[{ required: true }]}
                              >
                                <Input />
                              </Form.Item>
                              <Row gutter={12}>
                                <Col xs={24} md={12}>
                                  <Form.Item
                                    key={`${field.key}-order`}
                                    name={[field.name, "display_order"]}
                                    label="Order"
                                    rules={[{ required: true }]}
                                  >
                                    <Input disabled />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                  <Form.Item key={`${field.key}-correct`} name={[field.name, "is_correct"]} label="Correct">
                                    <Select options={[{ label: "No", value: false }, { label: "Yes", value: true }]} />
                                  </Form.Item>
                                </Col>
                              </Row>
                            </div>
                          ))}
                        </Space>
                      )}
                    </Form.List>
                  </Card>
                ) : (
                  <Card size="small" title="Answer mode" className="admin-question-side-card">
                    Numeric questions do not need option choices. Submit from this step to create the question.
                  </Card>
                )}
              </div>
              <div className="admin-question-side">
                <Card size="small" title="Question summary" className="admin-question-side-card">
                  <div className="admin-question-summary">
                    <div>
                      <strong>Type</strong>
                      <span>{questionType || "Not set"}</span>
                    </div>
                    <div>
                      <strong>Exam</strong>
                      <span>{formatExamNames(exams.filter((exam) => (questionExamIds || []).includes(exam.id)))}</span>
                    </div>
                    <div>
                      <strong>Status</strong>
                      <span>{questionStatus || "active"}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
}

export default AdminContentPage;
