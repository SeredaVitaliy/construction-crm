-- Только для публичного демо-стенда: каждую ночь возвращает демо-данные в исходное состояние.
-- Требует выполненного supabase/seed.sql (функция demo.reset) и расширения pg_cron.
-- На рабочей базе с настоящими данными НЕ выполнять: demo.reset() удаляет все объекты и задачи.

create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job where jobname = 'reset-demo-data';

select cron.schedule('reset-demo-data', '0 1 * * *', 'select demo.reset()');
