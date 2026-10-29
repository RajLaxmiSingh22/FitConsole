-- FitConsole schema baseline (2026-10-29).
-- Replaces the 13 migrations from 202610270001 to 202610280007, which are folded into this file.
-- New databases run this file; databases that already applied all 13 old migrations skip it (see runMigrations.js).
-- Generated with pg_dump --schema-only from a database built by those migrations; edit future changes as new files.

CREATE TYPE public.enum_cashfree_orders_status AS ENUM (
    'pending',
    'success',
    'failed'
);

CREATE TYPE public.enum_clients_blood_group AS ENUM (
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-'
);

CREATE TYPE public.enum_diet_plans_status AS ENUM (
    'draft',
    'approved',
    'rejected'
);

CREATE TYPE public.enum_memberships_status AS ENUM (
    'active',
    'pending_payment',
    'expired',
    'cancelled'
);

CREATE TYPE public.enum_payments_payment_method AS ENUM (
    'cash',
    'upi',
    'card'
);

CREATE TYPE public.enum_users_role AS ENUM (
    'owner',
    'trainer',
    'client'
);

CREATE TABLE public.analytics_events (
    id uuid NOT NULL,
    event_id uuid NOT NULL,
    visitor_id uuid,
    session_id uuid,
    type character varying(32) NOT NULL,
    page character varying(512) NOT NULL,
    source character varying(80),
    utm_source character varying(120),
    utm_medium character varying(120),
    utm_campaign character varying(160),
    lead_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT analytics_events_type_check CHECK (((type)::text = ANY ((ARRAY['page_view'::character varying, 'form_start'::character varying, 'form_submit'::character varying, 'trial_booking'::character varying, 'trial_attendance'::character varying, 'enrollment'::character varying])::text[])))
);

CREATE TABLE public.attendance (
    id uuid NOT NULL,
    member_id uuid NOT NULL,
    course_id uuid NOT NULL,
    trainer_id uuid,
    attended_at timestamp with time zone NOT NULL,
    attended_on date NOT NULL,
    override boolean DEFAULT false NOT NULL,
    override_reason text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.cashfree_orders (
    id uuid NOT NULL,
    cashfree_order_id character varying(50) NOT NULL,
    client_id uuid NOT NULL,
    membership_id uuid,
    payment_session_id text,
    created_by_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    reminder_date date,
    expires_at timestamp with time zone NOT NULL,
    status public.enum_cashfree_orders_status DEFAULT 'pending'::public.enum_cashfree_orders_status NOT NULL,
    payment_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.clients (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    trainer_id uuid,
    phone character varying(255),
    emergency_contact_phone character varying(255),
    date_of_birth date,
    height_cm numeric(5,2),
    weight_kg numeric(5,2),
    goal text,
    health_issues text,
    injuries text,
    blood_group public.enum_clients_blood_group,
    address text,
    id_proof_reference text,
    gender character varying(255),
    goal_category character varying(16),
    diet_preference character varying(16),
    allergies character varying(32)[] DEFAULT (ARRAY[]::character varying[])::character varying(32)[] NOT NULL,
    joined_at date NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT clients_diet_preference_check CHECK (((diet_preference IS NULL) OR ((diet_preference)::text = ANY ((ARRAY['veg'::character varying, 'non_veg'::character varying, 'eggetarian'::character varying, 'vegan'::character varying])::text[])))),
    CONSTRAINT clients_goal_category_check CHECK (((goal_category IS NULL) OR ((goal_category)::text = ANY ((ARRAY['fat_loss'::character varying, 'muscle_gain'::character varying, 'maintain'::character varying])::text[]))))
);

CREATE TABLE public.conversation_participants (
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL
);

CREATE TABLE public.conversations (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.course_plans (
    id uuid NOT NULL,
    course_id uuid NOT NULL,
    duration_months integer NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.courses (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(255) NOT NULL,
    description text,
    monthly_price numeric(10,2) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.diet_plan_reviews (
    diet_plan_id uuid NOT NULL,
    reviewed_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.diet_plans (
    id uuid NOT NULL,
    member_id uuid NOT NULL,
    trainer_id uuid NOT NULL,
    course_id uuid,
    plan jsonb NOT NULL,
    status public.enum_diet_plans_status DEFAULT 'draft'::public.enum_diet_plans_status NOT NULL,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.diet_tracker (
    id uuid NOT NULL,
    client_id uuid NOT NULL,
    recorded_on date NOT NULL,
    weight_kg numeric(5,2),
    sleep_duration_hours numeric(4,1),
    hunger character varying(255),
    mood character varying(255),
    triggers text,
    calories integer,
    macronutrients jsonb,
    fiber_grams numeric(6,2),
    water_liters numeric(5,2),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.diet_tracker_authors (
    diet_tracker_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.lead_activities (
    id uuid NOT NULL,
    lead_id uuid NOT NULL,
    user_id uuid,
    type character varying(32) NOT NULL,
    description text NOT NULL,
    previous_status character varying(32),
    new_status character varying(32),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT lead_activities_type_check CHECK (((type)::text = ANY ((ARRAY['note'::character varying, 'status_change'::character varying, 'trial_attendance'::character varying, 'enrollment'::character varying])::text[])))
);

CREATE TABLE public.members (
    user_id uuid NOT NULL,
    phone character varying(255),
    date_of_birth date,
    joined_at date NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.memberships (
    id uuid NOT NULL,
    member_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    status public.enum_memberships_status DEFAULT 'pending_payment'::public.enum_memberships_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    course_id uuid NOT NULL
);

CREATE TABLE public.messages (
    id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    body text NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.password_reset_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.payment_audit (
    id uuid NOT NULL,
    payment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action character varying(32) NOT NULL,
    old_values jsonb,
    new_values jsonb,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE public.payment_details (
    payment_id uuid NOT NULL,
    client_id uuid NOT NULL,
    reminder_date date,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.payments (
    id uuid NOT NULL,
    membership_id uuid,
    amount numeric(10,2) NOT NULL,
    payment_method public.enum_payments_payment_method NOT NULL,
    reference character varying(255),
    needs_review boolean DEFAULT false NOT NULL,
    voided_at timestamp with time zone,
    void_reason text,
    invoice_number bigint NOT NULL,
    paid_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE SEQUENCE public.payment_invoice_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.payment_invoice_number_seq OWNED BY public.payments.invoice_number;

CREATE TABLE public.progress_entries (
    id uuid NOT NULL,
    client_id uuid NOT NULL,
    weight_kg numeric(5,2),
    stamina smallint,
    stamina_notes text,
    recorded_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT progress_entries_stamina_check CHECK (((stamina IS NULL) OR ((stamina >= 1) AND (stamina <= 10))))
);

CREATE TABLE public.refresh_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    replaced_by_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.reminder_log (
    id uuid NOT NULL,
    payment_id uuid NOT NULL,
    client_id uuid NOT NULL,
    sent_by_id uuid,
    channel character varying(16) DEFAULT 'whatsapp'::character varying NOT NULL,
    amount_due numeric(10,2) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.trainer_courses (
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    trainer_id uuid NOT NULL,
    course_id uuid NOT NULL
);

CREATE TABLE public.trainer_details (
    user_id uuid NOT NULL,
    experience_years numeric(4,1),
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.trainers (
    user_id uuid NOT NULL,
    id uuid NOT NULL,
    phone character varying(255),
    certification character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.user_statuses (
    user_id uuid NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.users (
    id uuid NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role public.enum_users_role NOT NULL,
    token_version integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.waiver_acceptances (
    id uuid NOT NULL,
    client_id uuid NOT NULL,
    agreement_version character varying(255) NOT NULL,
    accepted_at timestamp with time zone NOT NULL,
    document_reference text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.waiver_audits (
    waiver_acceptance_id uuid NOT NULL,
    ip_address character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE public.website_leads (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(24) NOT NULL,
    normalized_phone character varying(10) NOT NULL,
    email character varying(320),
    course_id uuid,
    preferred_date date,
    preferred_slot character varying(120),
    message text,
    consent boolean NOT NULL,
    source character varying(80) DEFAULT 'website'::character varying NOT NULL,
    landing_page character varying(512),
    utm_source character varying(120),
    utm_medium character varying(120),
    utm_campaign character varying(160),
    status character varying(32) DEFAULT 'new'::character varying NOT NULL,
    trial_attended_at timestamp with time zone,
    client_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT website_leads_status_check CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'contacted'::character varying, 'trial_scheduled'::character varying, 'trial_confirmed'::character varying, 'trial_attended'::character varying, 'no_show'::character varying, 'enrolled'::character varying, 'lost'::character varying])::text[])))
);

ALTER TABLE ONLY public.payments ALTER COLUMN invoice_number SET DEFAULT nextval('public.payment_invoice_number_seq'::regclass);

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_event_id_key UNIQUE (event_id);

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cashfree_orders
    ADD CONSTRAINT cashfree_orders_cashfree_order_id_key UNIQUE (cashfree_order_id);

ALTER TABLE ONLY public.cashfree_orders
    ADD CONSTRAINT cashfree_orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (conversation_id, user_id);

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.course_plans
    ADD CONSTRAINT course_plans_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_name_key UNIQUE (name);

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.diet_plan_reviews
    ADD CONSTRAINT diet_plan_reviews_pkey PRIMARY KEY (diet_plan_id);

ALTER TABLE ONLY public.diet_plans
    ADD CONSTRAINT diet_plans_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.diet_tracker_authors
    ADD CONSTRAINT diet_tracker_authors_pkey PRIMARY KEY (diet_tracker_id);

ALTER TABLE ONLY public.diet_tracker
    ADD CONSTRAINT diet_tracker_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);

ALTER TABLE ONLY public.payment_audit
    ADD CONSTRAINT payment_audit_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payment_details
    ADD CONSTRAINT payment_details_pkey PRIMARY KEY (payment_id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.progress_entries
    ADD CONSTRAINT progress_entries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);

ALTER TABLE ONLY public.reminder_log
    ADD CONSTRAINT reminder_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.trainer_courses
    ADD CONSTRAINT trainer_courses_pkey PRIMARY KEY (trainer_id, course_id);

ALTER TABLE ONLY public.trainer_details
    ADD CONSTRAINT trainer_details_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.trainers
    ADD CONSTRAINT trainers_id_key UNIQUE (id);

ALTER TABLE ONLY public.trainers
    ADD CONSTRAINT trainers_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.user_statuses
    ADD CONSTRAINT user_statuses_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.waiver_acceptances
    ADD CONSTRAINT waiver_acceptances_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.waiver_audits
    ADD CONSTRAINT waiver_audits_pkey PRIMARY KEY (waiver_acceptance_id);

ALTER TABLE ONLY public.website_leads
    ADD CONSTRAINT website_leads_pkey PRIMARY KEY (id);

CREATE INDEX analytics_events_session_created_at_idx ON public.analytics_events USING btree (session_id, created_at);

CREATE INDEX analytics_events_session_id_created_at ON public.analytics_events USING btree (session_id, created_at);

CREATE INDEX analytics_events_type_created_at ON public.analytics_events USING btree (type, created_at);

CREATE INDEX analytics_events_type_created_at_idx ON public.analytics_events USING btree (type, created_at);

CREATE INDEX analytics_events_visitor_created_at_idx ON public.analytics_events USING btree (visitor_id, created_at);

CREATE INDEX analytics_events_visitor_id_created_at ON public.analytics_events USING btree (visitor_id, created_at);

CREATE INDEX attendance_attended_at_idx ON public.attendance USING btree (attended_at);

CREATE INDEX attendance_member_attended_at_idx ON public.attendance USING btree (member_id, attended_at);

CREATE UNIQUE INDEX attendance_member_course_day_unique_idx ON public.attendance USING btree (member_id, course_id, attended_on) WHERE (attended_on IS NOT NULL);

CREATE INDEX attendance_trainer_attended_at_idx ON public.attendance USING btree (trainer_id, attended_at);

CREATE INDEX cashfree_orders_membership_status_expiry_idx ON public.cashfree_orders USING btree (membership_id, status, expires_at);

CREATE UNIQUE INDEX course_plans_course_id_duration_months ON public.course_plans USING btree (course_id, duration_months);

CREATE INDEX diet_tracker_client_id_recorded_on ON public.diet_tracker USING btree (client_id, recorded_on);

CREATE INDEX lead_activities_lead_created_at_idx ON public.lead_activities USING btree (lead_id, created_at);

CREATE INDEX lead_activities_lead_id_created_at ON public.lead_activities USING btree (lead_id, created_at);

CREATE INDEX memberships_status_end_date_idx ON public.memberships USING btree (status, end_date);

CREATE INDEX messages_conversation_id_created_at ON public.messages USING btree (conversation_id, created_at);

CREATE INDEX password_reset_tokens_user_expires_idx ON public.password_reset_tokens USING btree (user_id, expires_at);

CREATE INDEX password_reset_tokens_user_id_expires_at ON public.password_reset_tokens USING btree (user_id, expires_at);

CREATE INDEX payment_audit_payment_created_at_idx ON public.payment_audit USING btree (payment_id, created_at);

CREATE INDEX payment_details_open_reminders_idx ON public.payment_details USING btree (reminder_date) WHERE (resolved_at IS NULL);

CREATE UNIQUE INDEX payments_invoice_number_idx ON public.payments USING btree (invoice_number);

CREATE INDEX payments_membership_voided_at_idx ON public.payments USING btree (membership_id, voided_at);

CREATE INDEX payments_paid_at_active_idx ON public.payments USING btree (paid_at) WHERE (voided_at IS NULL);

CREATE INDEX progress_entries_client_recorded_idx ON public.progress_entries USING btree (client_id, recorded_at);

CREATE INDEX refresh_tokens_user_active_idx ON public.refresh_tokens USING btree (user_id) WHERE (revoked_at IS NULL);

CREATE INDEX reminder_log_client_created_at_idx ON public.reminder_log USING btree (client_id, created_at);

CREATE UNIQUE INDEX waiver_acceptances_client_id_agreement_version ON public.waiver_acceptances USING btree (client_id, agreement_version);

CREATE INDEX website_leads_course_created_at_idx ON public.website_leads USING btree (course_id, created_at);

CREATE INDEX website_leads_course_id_created_at ON public.website_leads USING btree (course_id, created_at);

CREATE INDEX website_leads_normalized_phone_created_at ON public.website_leads USING btree (normalized_phone, created_at);

CREATE INDEX website_leads_phone_created_at_idx ON public.website_leads USING btree (normalized_phone, created_at);

CREATE INDEX website_leads_status_created_at ON public.website_leads USING btree (status, created_at);

CREATE INDEX website_leads_status_created_at_idx ON public.website_leads USING btree (status, created_at);

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.website_leads(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(user_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.course_plans
    ADD CONSTRAINT course_plans_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.diet_plan_reviews
    ADD CONSTRAINT diet_plan_reviews_diet_plan_id_fkey FOREIGN KEY (diet_plan_id) REFERENCES public.diet_plans(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.diet_plans
    ADD CONSTRAINT diet_plans_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.diet_plans
    ADD CONSTRAINT diet_plans_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(user_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.diet_plans
    ADD CONSTRAINT diet_plans_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.diet_tracker_authors
    ADD CONSTRAINT diet_tracker_authors_diet_tracker_id_fkey FOREIGN KEY (diet_tracker_id) REFERENCES public.diet_tracker(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.diet_tracker_authors
    ADD CONSTRAINT diet_tracker_authors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.diet_tracker
    ADD CONSTRAINT diet_tracker_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.website_leads(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(user_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.payment_audit
    ADD CONSTRAINT payment_audit_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.payment_details
    ADD CONSTRAINT payment_details_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.payment_details
    ADD CONSTRAINT payment_details_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.memberships(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.progress_entries
    ADD CONSTRAINT progress_entries_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.trainer_courses
    ADD CONSTRAINT trainer_courses_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.trainer_courses
    ADD CONSTRAINT trainer_courses_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.trainer_details
    ADD CONSTRAINT trainer_details_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.trainers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.trainers
    ADD CONSTRAINT trainers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.user_statuses
    ADD CONSTRAINT user_statuses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.waiver_acceptances
    ADD CONSTRAINT waiver_acceptances_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.waiver_audits
    ADD CONSTRAINT waiver_audits_waiver_acceptance_id_fkey FOREIGN KEY (waiver_acceptance_id) REFERENCES public.waiver_acceptances(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.website_leads
    ADD CONSTRAINT website_leads_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.website_leads
    ADD CONSTRAINT website_leads_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;
