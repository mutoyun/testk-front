import { useCallback, useEffect, useRef, useState } from 'react';
import { createUser, deleteUser, getUsers, type CreateUserPayload, type User } from './api';
import './App.css';

/* ── Toast system ────────────────────────────────────── */

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

let toastId = 0;

function Toasts({ items, onRemove }: { items: Toast[]; onRemove: (id: number) => void }) {
  useEffect(() => {
    if (items.length === 0) return;
    const latest = items[items.length - 1];
    const timer = setTimeout(() => onRemove(latest.id), 3500);
    return () => clearTimeout(timer);
  }, [items, onRemove]);

  return (
    <div className="toast-container">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === 'success' ? '✓' : '✕'} {t.message}
        </div>
      ))}
    </div>
  );
}

/* ── Confirm Dialog ──────────────────────────────────── */

function ConfirmDialog({
  userName,
  loading,
  onConfirm,
  onCancel,
}: {
  userName: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-body">
          <div className="confirm-icon">⚠️</div>
          <h3>유저 삭제</h3>
          <p>
            <strong>{userName}</strong> 유저를 정말 삭제하시겠습니까?
            <br />
            이 작업은 되돌릴 수 없습니다.
          </p>
        </div>
        <div className="confirm-footer">
          <button className="btn-secondary" onClick={onCancel} disabled={loading}>
            취소
          </button>
          <button className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Create User Modal ───────────────────────────────── */

function CreateModal({
  onCreated,
  onClose,
  addToast,
}: {
  onCreated: () => void;
  onClose: () => void;
  addToast: (type: Toast['type'], message: string) => void;
}) {
  const [form, setForm] = useState<CreateUserPayload>({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateUserPayload, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = '이름을 입력해주세요.';
    if (!form.email.trim()) e.email = '이메일을 입력해주세요.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = '올바른 이메일 형식이 아닙니다.';
    if (!form.password) e.password = '비밀번호를 입력해주세요.';
    else if (form.password.length < 8) e.password = '비밀번호는 최소 8자 이상이어야 합니다.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createUser(form);
      addToast('success', `${form.name} 유저가 등록되었습니다.`);
      onCreated();
      onClose();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '유저 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: keyof CreateUserPayload, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>새 유저 등록</h2>
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="name">이름</label>
              <input
                ref={nameRef}
                id="name"
                type="text"
                placeholder="홍길동"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="email">이메일</label>
              <input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="password">비밀번호</label>
              <input
                id="password"
                type="password"
                placeholder="8자 이상 입력"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
              />
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              취소
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main App ────────────────────────────────────────── */

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    setToasts((prev) => [...prev, { id: ++toastId, type, message }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '유저 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteUser(confirmDelete.id);
      addToast('success', `${confirmDelete.name} 유저가 삭제되었습니다.`);
      setConfirmDelete(null);
      fetchUsers();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '유저 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="app">
      <Toasts items={toasts} onRemove={removeToast} />

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1>👥 유저 관리</h1>
          <p>등록된 유저를 관리합니다</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + 유저 등록
        </button>
      </header>

      {/* Table */}
      <div className="table-card">
        {loading ? (
          <div className="loading">
            <div className="spinner" />
            유저 목록을 불러오는 중...
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>등록된 유저가 없습니다</h3>
            <p>위의 '유저 등록' 버튼으로 첫 유저를 추가해보세요.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>등록일</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td className="user-name">{user.name}</td>
                    <td className="user-email">{user.email}</td>
                    <td className="user-date">{formatDate(user.created_at)}</td>
                    <td>
                      <button className="btn-delete" onClick={() => setConfirmDelete(user)}>
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateModal
          onCreated={fetchUsers}
          onClose={() => setShowCreate(false)}
          addToast={addToast}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          userName={confirmDelete.name}
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

export default App;
