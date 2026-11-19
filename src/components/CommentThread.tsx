import { useState } from 'react';
import { App, Button, Empty, Flex, Input, Popconfirm, Skeleton } from 'antd';
import { addTaskComment, deleteTaskComment, fetchTaskComments } from '@/api/tasks';
import { useAsync } from '@/hooks/useAsync';
import { formatDateTime } from '@/lib/format';
import { LoadError } from './LoadError';
import { UserAvatar } from './UserAvatar';

export function CommentThread({ taskId, currentUserId }: { taskId: string; currentUserId: string }) {
  const { message } = App.useApp();
  const comments = useAsync(() => fetchTaskComments(taskId), [taskId]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      await addTaskComment(taskId, body);
      setDraft('');
      comments.reload();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteTaskComment(id);
      comments.reload();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  if (comments.error) return <LoadError message={comments.error} onRetry={comments.reload} />;

  const list = comments.data ?? [];

  return (
    <>
      {comments.loading && !comments.data ? (
        <Skeleton active avatar />
      ) : list.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Обсуждения пока нет — напишите первым" />
      ) : (
        <div>
          {list.map((c) => {
            const name = c.author?.full_name ?? '—';
            return (
              <div key={c.id} className="comment">
                <UserAvatar name={name} />
                <div style={{ minWidth: 0 }}>
                  <Flex justify="space-between" align="baseline" gap={8}>
                    <span>
                      <strong style={{ fontWeight: 600 }}>{name}</strong>
                      <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
                        {c.author?.role === 'manager' ? 'постановщик, ' : ''}
                        {formatDateTime(c.created_at)}
                      </span>
                    </span>
                    {c.author_id === currentUserId && (
                      <Popconfirm
                        title="Удалить комментарий?"
                        okText="Удалить"
                        cancelText="Отмена"
                        onConfirm={() => remove(c.id)}
                      >
                        <Button type="link" size="small" danger style={{ padding: 0, height: 'auto' }}>
                          Удалить
                        </Button>
                      </Popconfirm>
                    )}
                  </Flex>
                  <div className="comment-body">{c.body}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <Input.TextArea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Вопрос, уточнение или отчёт о работе"
          autoSize={{ minRows: 2, maxRows: 8 }}
          maxLength={4000}
          aria-label="Новый комментарий"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send();
          }}
        />
        <Flex justify="space-between" align="center" style={{ marginTop: 8 }}>
          <span className="muted" style={{ fontSize: 12 }}>
            Ctrl + Enter — отправить
          </span>
          <Button type="primary" onClick={send} loading={sending} disabled={!draft.trim()}>
            Отправить
          </Button>
        </Flex>
      </div>
    </>
  );
}
