-- Remove the top "background" image block from two system templates
-- per UX feedback: the image was being applied as a layout/background and
-- felt heavy. Drop b1 (image) and keep the rest of the blocks intact.

-- Wedding Planning Enquiry — "Your Dream Wedding Starts Here"
UPDATE forms_templates
SET config = '{"steps":[{"id":"step1","name":"Step 1","order":0,"type":"input"}],"blocks":[{"id":"b2","stepId":"step1","type":"text","props":{"content":"Your Dream Wedding Starts Here","variant":"heading","textAlign":"center"}},{"id":"b3","stepId":"step1","type":"text","props":{"content":"Let us help you plan the perfect day. Drop your email and we will be in touch.","variant":"body","textAlign":"center"}},{"id":"b4","stepId":"step1","type":"email","props":{"label":"Email address","placeholder":"Enter your email","required":true}},{"id":"b5","stepId":"step1","type":"button","props":{"label":"Get in touch","action":"submit"}}]}'::jsonb
WHERE name = 'Wedding Planning Enquiry' AND is_system_template = true;

-- Exit Intent — 10% Off — "Wait — Before You Go!"
UPDATE forms_templates
SET config = '{"steps":[{"id":"step1","name":"Step 1","order":0,"type":"input"}],"blocks":[{"id":"b2","stepId":"step1","type":"text","props":{"content":"Wait — Before You Go!","variant":"heading","textAlign":"center"}},{"id":"b3","stepId":"step1","type":"text","props":{"content":"Get 10% off your first order. Grab the code before you leave.","variant":"body","textAlign":"center"}},{"id":"b4","stepId":"step1","type":"email","props":{"label":"Email address","placeholder":"yourname@email.com","required":true}},{"id":"b5","stepId":"step1","type":"phone","props":{"label":"Mobile (optional)","placeholder":"+1 555 000 0000","required":false}},{"id":"b6","stepId":"step1","type":"button","props":{"label":"Claim my 10% off","action":"submit"}}]}'::jsonb
WHERE name = 'Exit Intent — 10% Off' AND is_system_template = true;
