import { useCallback, useEffect, useState } from "react";
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, message } from "antd";

import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

const roleOptions = [
  { label: "Student", value: "student" },
  { label: "Guardian", value: "guardian" },
  { label: "Admin", value: "admin" },
];

function AdminUsersPage() {
  const { token, user: currentUser } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const role = Form.useWatch("role", form);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiRequest("/api/admin/users", { token });
      setUsers(response);
    } catch (requestError) {
      messageApi.error(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [messageApi, token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await apiRequest("/api/admin/users", {
        method: "POST",
        token,
        body: values,
      });
      messageApi.success("User created.");
      setCreateOpen(false);
      form.resetFields();
      loadUsers();
    } catch (requestError) {
      if (requestError?.errorFields) {
        return;
      }
      messageApi.error(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);
    editForm.setFieldsValue({
      phone: user.phone,
      is_active: user.is_active,
      is_verified: user.is_verified,
      name: user.name,
      class_name: user.class_name,
      board: user.board,
      school_name: user.school_name,
      relationship_to_student: user.relationship_to_student,
    });
  };

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      const payload = {
        name: values.name ?? "",
        phone: values.phone ?? "",
        is_active: values.is_active,
        is_verified: values.is_verified,
      };

      if (editingUser.role === "student") {
        payload.class_name = values.class_name ?? "";
        payload.board = values.board ?? "";
        payload.school_name = values.school_name ?? "";
      }

      if (editingUser.role === "guardian") {
        payload.relationship_to_student = values.relationship_to_student ?? "";
      }

      setSaving(true);
      await apiRequest(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        token,
        body: payload,
      });
      messageApi.success("User updated.");
      setEditingUser(null);
      loadUsers();
    } catch (requestError) {
      if (requestError?.errorFields) {
        return;
      }
      messageApi.error(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    try {
      await apiRequest(`/api/admin/users/${user.id}`, {
        method: "DELETE",
        token,
      });
      messageApi.success("User deleted.");
      if (editingUser?.id === user.id) {
        setEditingUser(null);
      }
      loadUsers();
    } catch (requestError) {
      messageApi.error(requestError.message);
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: "Status",
      key: "status",
      render: (_, user) => (
        <Space wrap>
          <Tag color={user.is_active ? "green" : "red"}>{user.is_active ? "active" : "inactive"}</Tag>
          <Tag color={user.is_verified ? "blue" : "default"}>{user.is_verified ? "verified" : "unverified"}</Tag>
        </Space>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, user) => (
        <Space size="small">
          <Button type="link" onClick={() => openEdit(user)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete user?"
            description="This permanently removes the user and related profile data."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(user)}
            disabled={currentUser?.id === user.id}
          >
            <Button type="link" danger disabled={currentUser?.id === user.id}>
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
      <Card
        title="Users"
        extra={
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            Create user
          </Button>
        }
        className="admin-card"
      >
        <Table rowKey="id" columns={columns} dataSource={users} loading={loading} scroll={{ x: 900 }} />
      </Card>

      <Modal
        title="Create user"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ role: "student" }}>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={role === "admin" ? [] : [{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          {role === "student" ? (
            <>
              <Form.Item name="class_name" label="Class" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="board" label="Board">
                <Input />
              </Form.Item>
              <Form.Item name="school_name" label="School">
                <Input />
              </Form.Item>
            </>
          ) : null}
          {role === "guardian" ? (
            <Form.Item name="relationship_to_student" label="Relationship">
              <Input />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>

      <Modal
        title={editingUser ? `Edit ${editingUser.email}` : "Edit user"}
        open={Boolean(editingUser)}
        onCancel={() => setEditingUser(null)}
        onOk={handleEdit}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="Name">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="class_name" label="Class">
            <Input disabled={editingUser?.role !== "student"} />
          </Form.Item>
          <Form.Item name="board" label="Board">
            <Input disabled={editingUser?.role !== "student"} />
          </Form.Item>
          <Form.Item name="school_name" label="School">
            <Input disabled={editingUser?.role !== "student"} />
          </Form.Item>
          <Form.Item name="relationship_to_student" label="Relationship">
            <Input disabled={editingUser?.role !== "guardian"} />
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="is_verified" label="Verified" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AdminUsersPage;
