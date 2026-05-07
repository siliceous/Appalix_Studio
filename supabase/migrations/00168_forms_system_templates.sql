-- ============================================================
-- System Form Templates (with stock images)
-- ============================================================

INSERT INTO forms_templates (workspace_id, name, description, preview_image_url, type, goal, channel_mode, is_multi_step, is_system_template, tags, category, config, theme) VALUES

-- 1. Café Newsletter
(null,
 'Café Newsletter',
 'Invite coffee lovers to join your email list with a warm, welcoming popup.',
 '/form-images/cafe-staff.jpg',
 'popup', 'collect_subscribers', 'email_sms', false, true,
 ARRAY['cafe','restaurant','newsletter','food','hospitality'],
 'Food & Hospitality',
 '{"steps":[{"id":"step1","name":"Step 1","order":0,"type":"input"}],"blocks":[{"id":"b1","stepId":"step1","type":"image","props":{"src":"/form-images/cafe-staff.jpg","alt":"Café Staff","imageWidth":"100%"}},{"id":"b2","stepId":"step1","type":"text","props":{"content":"Join Our Coffee Club","variant":"heading","textAlign":"center"}},{"id":"b3","stepId":"step1","type":"text","props":{"content":"Get exclusive offers, seasonal menu updates and barista tips delivered straight to you.","variant":"body","textAlign":"center"}},{"id":"b4","stepId":"step1","type":"email","props":{"label":"Email address","placeholder":"yourname@email.com","required":true}},{"id":"b5","stepId":"step1","type":"phone","props":{"label":"Mobile (optional)","placeholder":"+1 555 000 0000","required":false}},{"id":"b6","stepId":"step1","type":"button","props":{"label":"Join the club","action":"submit"}}]}',
 '{"colors":{"primary":"#92400E","background":"#fffbf7","text":"#1c1917"},"buttons":{"radius":"8px"},"fields":{"radius":"6px","borderColor":"#d6d3d1"},"modal":{"width":"480px","radius":"16px"}}'),

-- 2. Fitness Challenge Signup
(null,
 'Fitness Challenge Signup',
 'Drive sign-ups for your next run, race or fitness challenge with an energetic popup.',
 '/form-images/runners.jpg',
 'popup', 'collect_subscribers', 'email_only', false, true,
 ARRAY['fitness','sport','running','challenge','health'],
 'Health & Fitness',
 '{"steps":[{"id":"step1","name":"Step 1","order":0,"type":"input"}],"blocks":[{"id":"b1","stepId":"step1","type":"image","props":{"src":"/form-images/runners.jpg","alt":"Runners","imageWidth":"100%"}},{"id":"b2","stepId":"step1","type":"text","props":{"content":"Ready to Run?","variant":"heading","textAlign":"center"}},{"id":"b3","stepId":"step1","type":"text","props":{"content":"Join thousands of runners and get training plans, race tips and early-bird entries.","variant":"body","textAlign":"center"}},{"id":"b4","stepId":"step1","type":"email","props":{"label":"Your email","placeholder":"Enter your email","required":true}},{"id":"b5","stepId":"step1","type":"button","props":{"label":"Sign me up","action":"submit"}}]}',
 '{"colors":{"primary":"#059669","background":"#f0fdf4","text":"#064e3b"},"buttons":{"radius":"8px"},"fields":{"radius":"6px","borderColor":"#a7f3d0"},"modal":{"width":"460px","radius":"12px"}}'),

-- 3. Yoga & Wellness Studio
(null,
 'Yoga & Wellness Studio',
 'A calm, minimal embedded signup form perfect for wellness studios and retreat pages.',
 '/form-images/yoga-class.jpg',
 'embedded', 'collect_subscribers', 'email_only', false, true,
 ARRAY['yoga','wellness','meditation','studio','health'],
 'Health & Fitness',
 '{"steps":[{"id":"step1","name":"Step 1","order":0,"type":"input"}],"blocks":[{"id":"b1","stepId":"step1","type":"text","props":{"content":"Find Your Balance","variant":"heading","textAlign":"center"}},{"id":"b2","stepId":"step1","type":"image","props":{"src":"/form-images/yoga-class.jpg","alt":"Yoga class","imageWidth":"100%"}},{"id":"b3","stepId":"step1","type":"text","props":{"content":"Subscribe to receive class schedules, mindfulness tips and exclusive member offers.","variant":"body","textAlign":"center"}},{"id":"b4","stepId":"step1","type":"email","props":{"label":"Email address","placeholder":"yourname@email.com","required":true}},{"id":"b5","stepId":"step1","type":"button","props":{"label":"Subscribe","action":"submit"}}]}',
 '{"colors":{"primary":"#7c3aed","background":"#faf5ff","text":"#3b0764"},"buttons":{"radius":"20px"},"fields":{"radius":"8px","borderColor":"#ddd6fe"},"modal":{"width":"500px","radius":"12px"}}'),

-- 4. Wedding Planning Enquiry
(null,
 'Wedding Planning Enquiry',
 'Capture enquiries from engaged couples looking for wedding planning services.',
 '/form-images/bride-beach.jpg',
 'popup', 'collect_subscribers', 'email_only', false, true,
 ARRAY['wedding','bridal','events','planning','couples'],
 'Events & Occasions',
 '{"steps":[{"id":"step1","name":"Step 1","order":0,"type":"input"}],"blocks":[{"id":"b1","stepId":"step1","type":"image","props":{"src":"/form-images/bride-beach.jpg","alt":"Bride","imageWidth":"100%"}},{"id":"b2","stepId":"step1","type":"text","props":{"content":"Your Dream Wedding Starts Here","variant":"heading","textAlign":"center"}},{"id":"b3","stepId":"step1","type":"text","props":{"content":"Let us help you plan the perfect day. Drop your email and we will be in touch.","variant":"body","textAlign":"center"}},{"id":"b4","stepId":"step1","type":"email","props":{"label":"Email address","placeholder":"Enter your email","required":true}},{"id":"b5","stepId":"step1","type":"button","props":{"label":"Get in touch","action":"submit"}}]}',
 '{"colors":{"primary":"#db2777","background":"#fff1f2","text":"#881337"},"buttons":{"radius":"24px"},"fields":{"radius":"8px","borderColor":"#fecdd3"},"modal":{"width":"460px","radius":"16px"}}'),

-- 5. Business Team Newsletter
(null,
 'Business Team Newsletter',
 'A professional popup to grow your B2B email list and capture business leads.',
 '/form-images/business-team.jpg',
 'popup', 'collect_subscribers', 'email_only', false, true,
 ARRAY['business','b2b','professional','newsletter','corporate'],
 'Business & Professional',
 '{"steps":[{"id":"step1","name":"Step 1","order":0,"type":"input"}],"blocks":[{"id":"b1","stepId":"step1","type":"image","props":{"src":"/form-images/business-team.jpg","alt":"Business team","imageWidth":"100%"}},{"id":"b2","stepId":"step1","type":"text","props":{"content":"Stay Ahead of the Game","variant":"heading","textAlign":"center"}},{"id":"b3","stepId":"step1","type":"text","props":{"content":"Get industry insights, growth strategies and exclusive content delivered weekly.","variant":"body","textAlign":"center"}},{"id":"b4","stepId":"step1","type":"email","props":{"label":"Work email","placeholder":"you@company.com","required":true}},{"id":"b5","stepId":"step1","type":"button","props":{"label":"Subscribe now","action":"submit"}}]}',
 '{"colors":{"primary":"#2563eb","background":"#ffffff","text":"#1e3a5f"},"buttons":{"radius":"8px"},"fields":{"radius":"6px","borderColor":"#bfdbfe"},"modal":{"width":"480px","radius":"12px"}}'),

-- 6. Solar Energy Quote
(null,
 'Solar Energy Quote Request',
 'Capture leads for solar energy installations with an eco-friendly popup.',
 '/form-images/solar-couple.jpg',
 'popup', 'collect_subscribers', 'email_sms', false, true,
 ARRAY['solar','energy','eco','green','home'],
 'Home & Trade',
 '{"steps":[{"id":"step1","name":"Step 1","order":0,"type":"input"}],"blocks":[{"id":"b1","stepId":"step1","type":"text","props":{"content":"Switch to Solar Today","variant":"heading","textAlign":"center"}},{"id":"b2","stepId":"step1","type":"image","props":{"src":"/form-images/solar-couple.jpg","alt":"Solar panels","imageWidth":"100%"}},{"id":"b3","stepId":"step1","type":"text","props":{"content":"Get a free quote and start saving on your energy bills. No obligation.","variant":"body","textAlign":"center"}},{"id":"b4","stepId":"step1","type":"email","props":{"label":"Email address","placeholder":"yourname@email.com","required":true}},{"id":"b5","stepId":"step1","type":"phone","props":{"label":"Phone number","placeholder":"+1 555 000 0000","required":true}},{"id":"b6","stepId":"step1","type":"button","props":{"label":"Get my free quote","action":"submit"}}]}',
 '{"colors":{"primary":"#065f46","background":"#ecfdf5","text":"#064e3b"},"buttons":{"radius":"8px"},"fields":{"radius":"6px","borderColor":"#6ee7b7"},"modal":{"width":"480px","radius":"12px"}}'),

-- 7. Kids Birthday Party
(null,
 'Kids Party Alert',
 'Promote party packages and collect RSVPs for kids birthday and event venues.',
 '/form-images/kids-birthday.jpg',
 'popup', 'promote_offers', 'email_only', false, true,
 ARRAY['kids','birthday','party','events','family','children'],
 'Events & Occasions',
 '{"steps":[{"id":"step1","name":"Step 1","order":0,"type":"input"}],"blocks":[{"id":"b1","stepId":"step1","type":"image","props":{"src":"/form-images/kids-birthday.jpg","alt":"Kids birthday party","imageWidth":"100%"}},{"id":"b2","stepId":"step1","type":"text","props":{"content":"Make Their Day Magical!","variant":"heading","textAlign":"center"}},{"id":"b3","stepId":"step1","type":"text","props":{"content":"Sign up to see our party packages and get 10% off your first booking.","variant":"body","textAlign":"center"}},{"id":"b4","stepId":"step1","type":"email","props":{"label":"Your email","placeholder":"Enter your email","required":true}},{"id":"b5","stepId":"step1","type":"button","props":{"label":"See packages","action":"submit"}}]}',
 '{"colors":{"primary":"#d97706","background":"#fffbeb","text":"#78350f"},"buttons":{"radius":"20px"},"fields":{"radius":"8px","borderColor":"#fde68a"},"modal":{"width":"460px","radius":"16px"}}'),

-- 8. Fashion Sale Alert
(null,
 'Fashion Sale Alert',
 'Promote your latest sale or collection drop with a stylish popup and countdown.',
 '/form-images/shopping-woman.jpg',
 'popup', 'promote_offers', 'email_sms', false, true,
 ARRAY['fashion','sale','clothing','retail','style','shopping'],
 'Retail & Fashion',
 '{"steps":[{"id":"step1","name":"Step 1","order":0,"type":"input"}],"blocks":[{"id":"b1","stepId":"step1","type":"image","props":{"src":"/form-images/shopping-woman.jpg","alt":"Shopping","imageWidth":"100%"}},{"id":"b2","stepId":"step1","type":"text","props":{"content":"Exclusive Sale — Members Only","variant":"heading","textAlign":"center"}},{"id":"b3","stepId":"step1","type":"text","props":{"content":"Join our VIP list and be first to know about sales, new arrivals and style drops.","variant":"body","textAlign":"center"}},{"id":"b4","stepId":"step1","type":"email","props":{"label":"Email address","placeholder":"Enter your email","required":true}},{"id":"b5","stepId":"step1","type":"phone","props":{"label":"Mobile for SMS alerts","placeholder":"+1 555 000 0000","required":false}},{"id":"b6","stepId":"step1","type":"button","props":{"label":"Join the VIP list","action":"submit"}}]}',
 '{"colors":{"primary":"#be185d","background":"#ffffff","text":"#1f2937"},"buttons":{"radius":"4px"},"fields":{"radius":"4px","borderColor":"#e5e7eb"},"modal":{"width":"480px","radius":"8px"}}'),

-- 9. Baby Shower RSVP
(null,
 'Baby Shower RSVP',
 'Collect RSVPs and contact details for baby showers, gender reveals and family events.',
 '/form-images/baby-shower.jpg',
 'popup', 'collect_subscribers', 'email_only', false, true,
 ARRAY['baby','shower','family','rsvp','events','celebration'],
 'Events & Occasions',
 '{"steps":[{"id":"step1","name":"Step 1","order":0,"type":"input"}],"blocks":[{"id":"b1","stepId":"step1","type":"image","props":{"src":"/form-images/baby-shower.jpg","alt":"Baby shower","imageWidth":"100%"}},{"id":"b2","stepId":"step1","type":"text","props":{"content":"You are Invited!","variant":"heading","textAlign":"center"}},{"id":"b3","stepId":"step1","type":"text","props":{"content":"Please let us know you are coming by adding your details below.","variant":"body","textAlign":"center"}},{"id":"b4","stepId":"step1","type":"text_input","props":{"label":"Your name","placeholder":"Full name","required":true}},{"id":"b5","stepId":"step1","type":"email","props":{"label":"Email address","placeholder":"yourname@email.com","required":true}},{"id":"b6","stepId":"step1","type":"button","props":{"label":"RSVP now","action":"submit"}}]}',
 '{"colors":{"primary":"#6366f1","background":"#f5f3ff","text":"#3730a3"},"buttons":{"radius":"16px"},"fields":{"radius":"8px","borderColor":"#c7d2fe"},"modal":{"width":"460px","radius":"16px"}}'),

-- 10. Back in Stock Alert
(null,
 'Back in Stock Alert',
 'Let customers register their interest so you can notify them when a product is back.',
 '/form-images/graduation.jpg',
 'popup', 'out_of_stock_interest', 'email_only', false, true,
 ARRAY['back-in-stock','waitlist','retail','ecommerce','product'],
 'Retail & Fashion',
 '{"steps":[{"id":"step1","name":"Step 1","order":0,"type":"input"}],"blocks":[{"id":"b1","stepId":"step1","type":"text","props":{"content":"This item is sold out","variant":"heading","textAlign":"center"}},{"id":"b2","stepId":"step1","type":"text","props":{"content":"Enter your email and we will notify you the moment it is back in stock.","variant":"body","textAlign":"center"}},{"id":"b3","stepId":"step1","type":"email","props":{"label":"Email address","placeholder":"yourname@email.com","required":true}},{"id":"b4","stepId":"step1","type":"button","props":{"label":"Notify me","action":"submit"}}]}',
 '{"colors":{"primary":"#374151","background":"#f9fafb","text":"#111827"},"buttons":{"radius":"6px"},"fields":{"radius":"6px","borderColor":"#d1d5db"},"modal":{"width":"420px","radius":"12px"}}'),

-- 11. Exit Intent — 10% Off
(null,
 'Exit Intent — 10% Off',
 'Stop visitors leaving with an irresistible discount offer before they go.',
 '/form-images/balloons-beach.jpg',
 'popup', 'stop_abandonment', 'email_sms', false, true,
 ARRAY['exit-intent','discount','offer','abandonment','sale'],
 'Retail & Fashion',
 '{"steps":[{"id":"step1","name":"Step 1","order":0,"type":"input"}],"blocks":[{"id":"b1","stepId":"step1","type":"image","props":{"src":"/form-images/balloons-beach.jpg","alt":"Celebration","imageWidth":"100%"}},{"id":"b2","stepId":"step1","type":"text","props":{"content":"Wait — Before You Go!","variant":"heading","textAlign":"center"}},{"id":"b3","stepId":"step1","type":"text","props":{"content":"Get 10% off your first order. Grab the code before you leave.","variant":"body","textAlign":"center"}},{"id":"b4","stepId":"step1","type":"email","props":{"label":"Email address","placeholder":"yourname@email.com","required":true}},{"id":"b5","stepId":"step1","type":"phone","props":{"label":"Mobile (optional)","placeholder":"+1 555 000 0000","required":false}},{"id":"b6","stepId":"step1","type":"button","props":{"label":"Claim my 10% off","action":"submit"}}]}',
 '{"colors":{"primary":"#f97316","background":"#fff7ed","text":"#7c2d12"},"buttons":{"radius":"8px"},"fields":{"radius":"6px","borderColor":"#fed7aa"},"modal":{"width":"480px","radius":"16px"}}'),

-- 12. Spin to Win
(null,
 'Spin to Win',
 'Boost engagement with a fun multi-step wheel of fortune. Capture email first, then let them spin.',
 '/form-images/balloons-beach.jpg',
 'popup', 'promote_offers', 'email_only', true, true,
 ARRAY['spin','wheel','gamification','discount','offers','fun'],
 'Retail & Fashion',
 '{"steps":[{"id":"step1","name":"Enter email","order":0,"type":"input"},{"id":"step2","name":"Spin the wheel","order":1,"type":"custom"}],"blocks":[{"id":"b1","stepId":"step1","type":"text","props":{"content":"Try Your Luck!","variant":"heading","textAlign":"center"}},{"id":"b2","stepId":"step1","type":"text","props":{"content":"Enter your email for a chance to win a special prize.","variant":"body","textAlign":"center"}},{"id":"b3","stepId":"step1","type":"email","props":{"label":"Email address","placeholder":"yourname@email.com","required":true}},{"id":"b4","stepId":"step1","type":"button","props":{"label":"Spin to win","action":"next_step"}},{"id":"b5","stepId":"step2","type":"text","props":{"content":"Spin the Wheel!","variant":"heading","textAlign":"center"}},{"id":"b6","stepId":"step2","type":"wheel_of_fortune","props":{"label":"Good luck!","options":["10% Off","Free Shipping","20% Off","Try Again","15% Off","Free Gift","5% Off","Try Again"]}},{"id":"b7","stepId":"step2","type":"button","props":{"label":"Spin now","action":"submit"}}]}',
 '{"colors":{"primary":"#7c3aed","background":"#ffffff","text":"#1f2937"},"buttons":{"radius":"8px"},"fields":{"radius":"6px","borderColor":"#e5e7eb"},"modal":{"width":"480px","radius":"16px"}}'),

-- 13. Garden Dinner & Events
(null,
 'Garden Dinner & Events',
 'Promote outdoor dining events and build your guest list with this inviting popup.',
 '/form-images/garden-dinner.jpg',
 'popup', 'collect_subscribers', 'email_sms', false, true,
 ARRAY['restaurant','outdoor','dining','events','food','bbq'],
 'Food & Hospitality',
 '{"steps":[{"id":"step1","name":"Step 1","order":0,"type":"input"}],"blocks":[{"id":"b1","stepId":"step1","type":"image","props":{"src":"/form-images/garden-dinner.jpg","alt":"Garden dinner","imageWidth":"100%"}},{"id":"b2","stepId":"step1","type":"text","props":{"content":"Join Us for Our Next Event","variant":"heading","textAlign":"center"}},{"id":"b3","stepId":"step1","type":"text","props":{"content":"Sign up to receive event invitations, seasonal menus and early-bird bookings.","variant":"body","textAlign":"center"}},{"id":"b4","stepId":"step1","type":"email","props":{"label":"Email address","placeholder":"yourname@email.com","required":true}},{"id":"b5","stepId":"step1","type":"phone","props":{"label":"Phone (optional)","placeholder":"+1 555 000 0000","required":false}},{"id":"b6","stepId":"step1","type":"button","props":{"label":"Count me in","action":"submit"}}]}',
 '{"colors":{"primary":"#16a34a","background":"#f0fdf4","text":"#14532d"},"buttons":{"radius":"8px"},"fields":{"radius":"6px","borderColor":"#bbf7d0"},"modal":{"width":"480px","radius":"16px"}}'),

-- 14. Summer Fashion Drop
(null,
 'Summer Fashion Drop',
 'Announce your summer collection with a vibrant flyout and grow your subscriber list.',
 '/form-images/summer-fashion.jpg',
 'flyout', 'promote_offers', 'email_sms', false, true,
 ARRAY['fashion','summer','collection','style','clothing','season'],
 'Retail & Fashion',
 '{"steps":[{"id":"step1","name":"Step 1","order":0,"type":"input"}],"blocks":[{"id":"b1","stepId":"step1","type":"image","props":{"src":"/form-images/summer-fashion.jpg","alt":"Summer fashion","imageWidth":"100%"}},{"id":"b2","stepId":"step1","type":"text","props":{"content":"The Summer Drop is Here","variant":"heading","textAlign":"center"}},{"id":"b3","stepId":"step1","type":"text","props":{"content":"Be first to shop the new summer collection. Sign up for early access.","variant":"body","textAlign":"center"}},{"id":"b4","stepId":"step1","type":"email","props":{"label":"Email address","placeholder":"yourname@email.com","required":true}},{"id":"b5","stepId":"step1","type":"phone","props":{"label":"Mobile for SMS alerts","placeholder":"+1 555 000 0000","required":false}},{"id":"b6","stepId":"step1","type":"button","props":{"label":"Get early access","action":"submit"}}]}',
 '{"colors":{"primary":"#f97316","background":"#fff7ed","text":"#431407"},"buttons":{"radius":"8px"},"fields":{"radius":"6px","borderColor":"#fed7aa"},"modal":{"width":"380px","radius":"16px"}}'),

-- 15. Asian Food Delivery
(null,
 'Food Delivery Signup',
 'Grow your delivery customer base with a mouth-watering popup for food businesses.',
 '/form-images/dim-sum.jpg',
 'popup', 'collect_subscribers', 'email_sms', false, true,
 ARRAY['food','delivery','restaurant','asian','takeaway','hospitality'],
 'Food & Hospitality',
 '{"steps":[{"id":"step1","name":"Step 1","order":0,"type":"input"}],"blocks":[{"id":"b1","stepId":"step1","type":"image","props":{"src":"/form-images/dim-sum.jpg","alt":"Food","imageWidth":"100%"}},{"id":"b2","stepId":"step1","type":"text","props":{"content":"Get 15% Off Your First Order","variant":"heading","textAlign":"center"}},{"id":"b3","stepId":"step1","type":"text","props":{"content":"Subscribe and receive your welcome discount plus weekly specials.","variant":"body","textAlign":"center"}},{"id":"b4","stepId":"step1","type":"email","props":{"label":"Email address","placeholder":"yourname@email.com","required":true}},{"id":"b5","stepId":"step1","type":"phone","props":{"label":"Mobile number","placeholder":"+1 555 000 0000","required":false}},{"id":"b6","stepId":"step1","type":"button","props":{"label":"Claim 15% off","action":"submit"}}]}',
 '{"colors":{"primary":"#dc2626","background":"#fff1f2","text":"#7f1d1d"},"buttons":{"radius":"8px"},"fields":{"radius":"6px","borderColor":"#fecaca"},"modal":{"width":"480px","radius":"16px"}}');
