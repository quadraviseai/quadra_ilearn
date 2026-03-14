import { useCallback, useEffect, useState } from "react";
import { Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Select, Space, Steps, Table, Tag, message } from "antd";

import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

function AdminContentPage() {
  const { token } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [activeSection, setActiveSection] = useState("exams");
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examOpen, setExamOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [conceptOpen, setConceptOpen] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [editingConcept, setEditingConcept] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionStep, setQuestionStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [examForm] = Form.useForm();
  const [subjectForm] = Form.useForm();
  const [conceptForm] = Form.useForm();
  const [questionForm] = Form.useForm();
  const [bulkUploadForm] = Form.useForm();
  const [aiGenerateForm] = Form.useForm();
  const questionType = Form.useWatch("question_type", questionForm);
  const questionExamIds = Form.useWatch("exam_ids", questionForm);
  const questionStatus = Form.useWatch("status", questionForm);
  const questionSubjectId = Form.useWatch("subject_id", questionForm);
  const questionConceptId = Form.useWatch("concept_id", questionForm);
  const bulkSubjectId = Form.useWatch("subject_id", bulkUploadForm);
  const bulkConceptId = Form.useWatch("concept_id", bulkUploadForm);
  const aiSubjectId = Form.useWatch("subject_id", aiGenerateForm);
  const aiConceptId = Form.useWatch("concept_id", aiGenerateForm);

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [examsData, subjectsData, conceptsData, questionsData] = await Promise.all([
        apiRequest("/api/admin/exams", { token }),
        apiRequest("/api/admin/subjects", { token }),
        apiRequest("/api/admin/concepts", { token }),
        apiRequest("/api/admin/questions", { token }),
      ]);
      setExams(examsData);
      setSubjects(subjectsData);
      setConcepts(conceptsData);
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

  const handleConceptModalClose = () => {
    setConceptOpen(false);
    setEditingConcept(null);
    conceptForm.resetFields();
  };

  const handleBulkUploadClose = () => {
    setBulkUploadOpen(false);
    bulkUploadForm.resetFields();
  };

  const handleAiGenerateClose = () => {
    setAiGenerateOpen(false);
    aiGenerateForm.resetFields();
  };

  const handleQuestionNext = async () => {
    try {
      await questionForm.validateFields([
        "subject_id",
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
          concept_id: values.concept_id,
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

  const handleAiGenerateSubmit = async () => {
    try {
      const values = await aiGenerateForm.validateFields();
      setSaving(true);
      await apiRequest("/api/admin/questions/generate-ai", {
        method: "POST",
        token,
        body: values,
      });
      messageApi.success("AI generated a draft question.");
      handleAiGenerateClose();
      loadData();
    } catch (requestError) {
      if (requestError?.errorFields) {
        return;
      }
      messageApi.error(requestError.message || "AI question generation failed.");
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
      name: concept?.name || "",
      description: concept?.description || "",
      exam_ids: (concept?.exams || []).map((exam) => exam.id),
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
  const conceptOptions = concepts.map((concept) => ({
    label: `${concept.subject_name} - ${concept.name}`,
    value: concept.id,
  }));
  const examOptions = exams.map((exam) => ({ label: exam.name, value: exam.id }));
  const selectedQuestionSubject = subjects.find((subject) => subject.id === questionSubjectId);
  const selectedQuestionConcept = concepts.find((concept) => concept.id === questionConceptId);
  const selectedBulkSubject = subjects.find((subject) => subject.id === bulkSubjectId);
  const selectedBulkConcept = concepts.find((concept) => concept.id === bulkConceptId);
  const selectedAiSubject = subjects.find((subject) => subject.id === aiSubjectId);
  const selectedAiConcept = concepts.find((concept) => concept.id === aiConceptId);
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
    return hasAllSelectedExams(conceptRecord.exams || [], questionExamIds || []);
  });
  const bulkConceptOptions = bulkSubjectId
    ? conceptOptions.filter((concept) => concepts.find((item) => item.id === concept.value)?.subject === bulkSubjectId)
    : conceptOptions;
  const aiConceptOptions = aiSubjectId
    ? conceptOptions.filter((concept) => concepts.find((item) => item.id === concept.value)?.subject === aiSubjectId)
    : conceptOptions;
  const getCommonExamOptions = (subject, concept) => {
    if (!subject && !concept) {
      return examOptions;
    }
    const subjectExamIds = new Set((subject?.exams || []).map((exam) => exam.id));
    const conceptExamIds = new Set((concept?.exams || []).map((exam) => exam.id));
    if (subject && concept) {
      return examOptions.filter((exam) => subjectExamIds.has(exam.value) && conceptExamIds.has(exam.value));
    }
    if (subject) {
      return examOptions.filter((exam) => subjectExamIds.has(exam.value));
    }
    if (concept) {
      return examOptions.filter((exam) => conceptExamIds.has(exam.value));
    }
    return examOptions;
  };
  const questionExamOptions = getCommonExamOptions(selectedQuestionSubject, selectedQuestionConcept);
  const bulkExamOptions = getCommonExamOptions(selectedBulkSubject, selectedBulkConcept);
  const aiExamOptions = getCommonExamOptions(selectedAiSubject, selectedAiConcept);

  const examColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Slug", dataIndex: "slug", key: "slug" },
    { title: "Subjects", dataIndex: "subject_count", key: "subject_count" },
    { title: "Concepts", dataIndex: "concept_count", key: "concept_count" },
    { title: "Questions", dataIndex: "question_count", key: "question_count" },
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
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Slug", dataIndex: "slug", key: "slug" },
    { title: "Exams", dataIndex: "exams", key: "exams", render: formatExamNames },
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

  const conceptColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Subject", dataIndex: "subject_name", key: "subject_name" },
    { title: "Exams", dataIndex: "exams", key: "exams", render: formatExamNames },
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

  const questionColumns = [
    { title: "Prompt", dataIndex: "prompt", key: "prompt", ellipsis: true },
    { title: "Exams", dataIndex: "exams", key: "exams", render: formatExamNames },
    { title: "Subject", dataIndex: "subject_name", key: "subject_name" },
    { title: "Concept", dataIndex: "concept_name", key: "concept_name" },
    { title: "Type", dataIndex: "question_type", key: "question_type" },
    { title: "Status", dataIndex: "status", key: "status", render: (value) => <Tag>{value}</Tag> },
    {
      title: "Actions",
      key: "actions",
      render: (_, question) => (
        <Space className="admin-table-actions" size="small">
          <Button type="link" onClick={() => openQuestionEditor(question)}>
            Edit
          </Button>
          <Button
            type="link"
            disabled={question.status === "draft"}
            onClick={async () => {
              try {
                await apiRequest(`/api/admin/questions/${question.id}`, {
                  method: "PATCH",
                  token,
                  body: { status: "draft" },
                });
                messageApi.success("Question moved to draft.");
                loadData();
              } catch (requestError) {
                messageApi.error(requestError.message);
              }
            }}
          >
            Make draft
          </Button>
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
              className={`admin-content-sidebar-link${activeSection === "concepts" ? " is-active" : ""}`}
              onClick={() => setActiveSection("concepts")}
            >
              Concepts
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
                extra={<Button onClick={() => openExamEditor()}>New exam</Button>}
                className="admin-card"
              >
                <Table rowKey="id" columns={examColumns} dataSource={exams} loading={loading} pagination={false} />
              </Card>
            </section>
          ) : null}

          {activeSection === "subjects" ? (
            <section className="admin-content-section">
              <Card
                title="Subjects"
                extra={<Button onClick={() => openSubjectEditor()}>New subject</Button>}
                className="admin-card"
              >
                <Table rowKey="id" columns={subjectColumns} dataSource={subjects} loading={loading} pagination={false} />
              </Card>
            </section>
          ) : null}

          {activeSection === "concepts" ? (
            <section className="admin-content-section">
              <Card
                title="Concepts"
                extra={<Button onClick={() => openConceptEditor()}>New concept</Button>}
                className="admin-card"
              >
                <Table rowKey="id" columns={conceptColumns} dataSource={concepts} loading={loading} pagination={false} />
              </Card>
            </section>
          ) : null}

          {activeSection === "questions" ? (
            <section className="admin-content-section">
              <Card
                title="Question bank"
                extra={
                  <Space wrap>
                    <Button onClick={() => setBulkUploadOpen(true)}>Bulk upload</Button>
                    <Button onClick={() => setAiGenerateOpen(true)}>Generate with AI</Button>
                    <Button type="primary" onClick={() => openQuestionEditor()}>New question</Button>
                  </Space>
                }
                className="admin-card"
              >
                <Table
                  rowKey="id"
                  columns={questionColumns}
                  dataSource={questions}
                  loading={loading}
                  pagination={false}
                  scroll={{ x: 1150 }}
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
            <Col xs={24} md={12}>
              <Form.Item name="subject_id" label="Subject" rules={[{ required: true }]}>
                <Select
                  options={subjectOptions}
                  onChange={() => {
                    bulkUploadForm.setFieldValue("concept_id", undefined);
                    bulkUploadForm.setFieldValue("exam_ids", []);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="concept_id" label="Concept" rules={[{ required: true }]}>
                <Select options={bulkConceptOptions} onChange={() => bulkUploadForm.setFieldValue("exam_ids", [])} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="exam_ids" label="Exams for this upload">
            <Select mode="multiple" allowClear options={bulkExamOptions} />
          </Form.Item>
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
        title="Generate question with AI"
        open={aiGenerateOpen}
        onCancel={handleAiGenerateClose}
        onOk={handleAiGenerateSubmit}
        confirmLoading={saving}
      >
        <Form
          form={aiGenerateForm}
          layout="vertical"
          initialValues={{
            exam_ids: [],
            question_type: "mcq_single",
            difficulty_level: 1,
          }}
        >
          <Form.Item name="subject_id" label="Subject" rules={[{ required: true }]}>
            <Select
              options={subjectOptions}
              onChange={() => {
                aiGenerateForm.setFieldValue("concept_id", undefined);
                aiGenerateForm.setFieldValue("exam_ids", []);
              }}
            />
          </Form.Item>
          <Form.Item name="concept_id" label="Concept" rules={[{ required: true }]}>
            <Select options={aiConceptOptions} onChange={() => aiGenerateForm.setFieldValue("exam_ids", [])} />
          </Form.Item>
          <Form.Item name="exam_ids" label="Exams" rules={[{ required: true, type: "array", min: 1 }]}>
            <Select mode="multiple" allowClear options={aiExamOptions} />
          </Form.Item>
          <Form.Item name="question_type" label="Question type" rules={[{ required: true }]}>
            <Select
              options={[
                { label: "Single correct MCQ", value: "mcq_single" },
                { label: "Multiple correct MCQ", value: "mcq_multi" },
                { label: "Numeric", value: "numeric" },
              ]}
            />
          </Form.Item>
          <Form.Item name="difficulty_level" label="Difficulty">
            <Select options={[1, 2, 3, 4, 5].map((value) => ({ label: `Level ${value}`, value }))} />
          </Form.Item>
          <Form.Item name="question_prompt" label="Question brief" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="Describe the question you want AI to generate." />
          </Form.Item>
        </Form>
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
            <Select options={subjectOptions} />
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
                          questionForm.setFieldValue("concept_id", undefined);
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="concept_id" label="Concept" rules={[{ required: true }]}>
                      <Select options={questionConceptOptions} disabled={!questionExamIds?.length || !questionSubjectId} />
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
