-- Widen goal columns to text[] so bots/agents can pursue multiple goals
alter table bots
  alter column voice_goal type text[] using
    case when voice_goal is null then '{}' else array[voice_goal] end;

alter table voice_agents
  alter column goal type text[] using
    case when goal is null then '{}' else array[goal] end;
