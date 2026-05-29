--
-- PostgreSQL database dump
--

\restrict KjpdeFubTIvbH4yW75ZwELWHwxO0vugxshkdHpfgXZyIeeS7cASEZAU1SpFT4SH

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-05-29 12:32:06

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 17007)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 5490 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 273 (class 1259 OID 41552)
-- Name: customer_admin_message_deletions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_admin_message_deletions (
    id integer NOT NULL,
    message_id integer NOT NULL,
    user_id integer NOT NULL,
    deleted_at timestamp without time zone DEFAULT now() NOT NULL,
    purged_at timestamp without time zone
);


ALTER TABLE public.customer_admin_message_deletions OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 41551)
-- Name: customer_admin_message_deletions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_admin_message_deletions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_admin_message_deletions_id_seq OWNER TO postgres;

--
-- TOC entry 5491 (class 0 OID 0)
-- Dependencies: 272
-- Name: customer_admin_message_deletions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_admin_message_deletions_id_seq OWNED BY public.customer_admin_message_deletions.id;


--
-- TOC entry 271 (class 1259 OID 41373)
-- Name: customer_admin_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_admin_messages (
    id integer NOT NULL,
    thread_id integer NOT NULL,
    sender_id integer NOT NULL,
    sender_type smallint NOT NULL,
    body text NOT NULL,
    report_fault_id integer,
    report_reference text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    user_task_id integer,
    attach_files text
);


ALTER TABLE public.customer_admin_messages OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 41372)
-- Name: customer_admin_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_admin_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_admin_messages_id_seq OWNER TO postgres;

--
-- TOC entry 5492 (class 0 OID 0)
-- Dependencies: 270
-- Name: customer_admin_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_admin_messages_id_seq OWNED BY public.customer_admin_messages.id;


--
-- TOC entry 269 (class 1259 OID 41356)
-- Name: customer_admin_threads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_admin_threads (
    id integer NOT NULL,
    customer_id integer,
    customer_last_read_at timestamp without time zone,
    admin_last_read_at timestamp without time zone,
    last_message_preview text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    staff_id integer,
    staff_last_read_at timestamp without time zone,
    peer_staff_id integer
);


ALTER TABLE public.customer_admin_threads OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 41355)
-- Name: customer_admin_threads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_admin_threads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_admin_threads_id_seq OWNER TO postgres;

--
-- TOC entry 5493 (class 0 OID 0)
-- Dependencies: 268
-- Name: customer_admin_threads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_admin_threads_id_seq OWNED BY public.customer_admin_threads.id;


--
-- TOC entry 284 (class 1259 OID 43192)
-- Name: customer_companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_companies (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    normalized_name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.customer_companies OWNER TO postgres;

--
-- TOC entry 283 (class 1259 OID 43191)
-- Name: customer_companies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_companies_id_seq OWNER TO postgres;

--
-- TOC entry 5494 (class 0 OID 0)
-- Dependencies: 283
-- Name: customer_companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_companies_id_seq OWNED BY public.customer_companies.id;


--
-- TOC entry 222 (class 1259 OID 17037)
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    user_id integer NOT NULL,
    city character varying(100),
    state character varying(100),
    post_code character varying(100),
    country character varying(200),
    website character varying(300),
    location character varying(200),
    land_line character varying(300),
    description character varying(500),
    send_login_info smallint,
    show_qr_code smallint,
    company_name character varying(200),
    company_phone character varying(200),
    company_email character varying(200),
    company_id integer
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 17049)
-- Name: groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.groups (
    id character varying(100) NOT NULL,
    name character varying(200),
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    description character varying(300),
    "order" smallint,
    service_id integer
);


ALTER TABLE public.groups OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 17055)
-- Name: items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.items (
    id integer NOT NULL,
    site_id integer,
    department_id integer,
    customer_id integer,
    created_at timestamp without time zone DEFAULT now(),
    config jsonb,
    required boolean DEFAULT false
);


ALTER TABLE public.items OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 17063)
-- Name: items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.items_id_seq OWNER TO postgres;

--
-- TOC entry 5495 (class 0 OID 0)
-- Dependencies: 226
-- Name: items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.items_id_seq OWNED BY public.items.id;


--
-- TOC entry 227 (class 1259 OID 17064)
-- Name: logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.logs (
    id integer NOT NULL,
    action character varying(100),
    message character varying(300),
    user_id integer,
    data text,
    created_at timestamp without time zone,
    entity character varying(100)
);


ALTER TABLE public.logs OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 17070)
-- Name: logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.logs_id_seq OWNER TO postgres;

--
-- TOC entry 5496 (class 0 OID 0)
-- Dependencies: 228
-- Name: logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.logs_id_seq OWNED BY public.logs.id;


--
-- TOC entry 229 (class 1259 OID 17071)
-- Name: positions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.positions (
    id character varying(100) NOT NULL,
    name character varying(200),
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    description character varying(300),
    "order" smallint
);


ALTER TABLE public.positions OWNER TO postgres;

--
-- TOC entry 291 (class 1259 OID 44628)
-- Name: report_fault_admin_visibility; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_fault_admin_visibility (
    id integer NOT NULL,
    report_fault_id integer NOT NULL,
    user_id integer NOT NULL,
    badge_dismissed_at timestamp without time zone
);


ALTER TABLE public.report_fault_admin_visibility OWNER TO postgres;

--
-- TOC entry 290 (class 1259 OID 44627)
-- Name: report_fault_admin_visibility_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_fault_admin_visibility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_fault_admin_visibility_id_seq OWNER TO postgres;

--
-- TOC entry 5497 (class 0 OID 0)
-- Dependencies: 290
-- Name: report_fault_admin_visibility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.report_fault_admin_visibility_id_seq OWNED BY public.report_fault_admin_visibility.id;


--
-- TOC entry 277 (class 1259 OID 42227)
-- Name: report_fault_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_fault_answers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_fault_answers_id_seq OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 17077)
-- Name: report_fault_answers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_fault_answers (
    id integer DEFAULT nextval('public.report_fault_answers_id_seq'::regclass) NOT NULL,
    report_fault_id integer,
    message text,
    created_at timestamp without time zone,
    user_id integer,
    updated_at timestamp without time zone,
    created_by integer,
    updated_by integer,
    type integer NOT NULL,
    attach_files character varying(5000)
);


ALTER TABLE public.report_fault_answers OWNER TO postgres;

--
-- TOC entry 293 (class 1259 OID 44912)
-- Name: report_fault_customer_visibility; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_fault_customer_visibility (
    id integer NOT NULL,
    report_fault_id integer NOT NULL,
    user_id integer NOT NULL,
    hidden_at timestamp without time zone,
    badge_dismissed_at timestamp without time zone,
    opened_at timestamp without time zone
);


ALTER TABLE public.report_fault_customer_visibility OWNER TO postgres;

--
-- TOC entry 292 (class 1259 OID 44911)
-- Name: report_fault_customer_visibility_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_fault_customer_visibility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_fault_customer_visibility_id_seq OWNER TO postgres;

--
-- TOC entry 5498 (class 0 OID 0)
-- Dependencies: 292
-- Name: report_fault_customer_visibility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.report_fault_customer_visibility_id_seq OWNED BY public.report_fault_customer_visibility.id;


--
-- TOC entry 266 (class 1259 OID 41240)
-- Name: report_faults_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_faults_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_faults_id_seq OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 17092)
-- Name: report_faults; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_faults (
    id integer DEFAULT nextval('public.report_faults_id_seq'::regclass) NOT NULL,
    customer_id integer,
    site_id integer,
    priority integer,
    message text,
    attach_files character varying(5000),
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    status smallint,
    subject character varying(300),
    service_name character varying(300),
    site_name character varying(300),
    customer_name character varying(300),
    sender smallint,
    company_name character varying(300),
    staff_id integer,
    admin_opened_at timestamp without time zone,
    customer_opened_at timestamp without time zone,
    admin_dashboard_dismissed_at timestamp without time zone,
    customer_dashboard_dismissed_at timestamp without time zone,
    service_id integer,
    issue character varying(120)
);


ALTER TABLE public.report_faults OWNER TO postgres;

--
-- TOC entry 5499 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN report_faults.admin_opened_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.report_faults.admin_opened_at IS 'Set when admin views the fault; NULL = unread on dashboard.';


--
-- TOC entry 5500 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN report_faults.customer_opened_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.report_faults.customer_opened_at IS 'Set when customer views staff-submitted fault; NULL = unread on customer dashboard.';


--
-- TOC entry 275 (class 1259 OID 42013)
-- Name: report_template_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_template_categories (
    id integer NOT NULL,
    name character varying(120) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.report_template_categories OWNER TO postgres;

--
-- TOC entry 274 (class 1259 OID 42012)
-- Name: report_template_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_template_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_template_categories_id_seq OWNER TO postgres;

--
-- TOC entry 5501 (class 0 OID 0)
-- Dependencies: 274
-- Name: report_template_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.report_template_categories_id_seq OWNED BY public.report_template_categories.id;


--
-- TOC entry 232 (class 1259 OID 17098)
-- Name: report_template_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_template_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_template_items_id_seq OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 17099)
-- Name: report_template_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_template_items (
    id integer DEFAULT nextval('public.report_template_items_id_seq'::regclass) NOT NULL,
    name character varying(300),
    type character varying(100),
    created_at timestamp without time zone,
    report_template_id integer,
    value text,
    "order" smallint,
    config jsonb,
    required boolean DEFAULT false NOT NULL
);


ALTER TABLE public.report_template_items OWNER TO postgres;

--
-- TOC entry 294 (class 1259 OID 46726)
-- Name: report_template_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_template_services (
    report_template_id integer NOT NULL,
    service_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.report_template_services OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 17108)
-- Name: report_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_templates_id_seq OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 17109)
-- Name: report_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_templates (
    id integer DEFAULT nextval('public.report_templates_id_seq'::regclass) NOT NULL,
    name character varying(10000),
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    description character varying(500),
    file_url character varying(300),
    status smallint,
    "order" smallint,
    category character varying(120) DEFAULT 'GENERAL'::character varying NOT NULL,
    settings jsonb,
    assigned_staff_id integer
);


ALTER TABLE public.report_templates OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 17118)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id character varying(50) NOT NULL,
    name character varying(200),
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by integer,
    updated_by integer,
    description character varying(300),
    "order" smallint
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 41291)
-- Name: schema_patches_applied; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schema_patches_applied (
    name character varying(128) NOT NULL,
    applied_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.schema_patches_applied OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 17043)
-- Name: services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.services (
    name character varying(200),
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    description character varying(300),
    id integer CONSTRAINT departments_id_not_null NOT NULL
);


ALTER TABLE public.services OWNER TO postgres;

--
-- TOC entry 285 (class 1259 OID 43851)
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.services_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.services_id_seq OWNER TO postgres;

--
-- TOC entry 5502 (class 0 OID 0)
-- Dependencies: 285
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- TOC entry 237 (class 1259 OID 17124)
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    setting_key character varying(100) NOT NULL,
    setting_value text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by integer,
    updated_by integer,
    setting_type character varying(50) DEFAULT 'TEXT'::character varying,
    "order" smallint DEFAULT 0,
    setting_lable character varying(300)
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- TOC entry 280 (class 1259 OID 42234)
-- Name: site_item_staff_shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.site_item_staff_shifts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.site_item_staff_shifts_id_seq OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 17132)
-- Name: site_item_staff_shifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.site_item_staff_shifts (
    id integer DEFAULT nextval('public.site_item_staff_shifts_id_seq'::regclass) NOT NULL,
    site_item_staff_id integer NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    type character varying(200),
    type_value character varying(100)
);


ALTER TABLE public.site_item_staff_shifts OWNER TO postgres;

--
-- TOC entry 279 (class 1259 OID 42232)
-- Name: site_item_staffs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.site_item_staffs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.site_item_staffs_id_seq OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 17137)
-- Name: site_item_staffs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.site_item_staffs (
    id integer DEFAULT nextval('public.site_item_staffs_id_seq'::regclass) NOT NULL,
    site_item_id integer NOT NULL,
    staff_id integer NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.site_item_staffs OWNER TO postgres;

--
-- TOC entry 278 (class 1259 OID 42230)
-- Name: site_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.site_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.site_items_id_seq OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 17143)
-- Name: site_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.site_items (
    id integer DEFAULT nextval('public.site_items_id_seq'::regclass) NOT NULL,
    created_at timestamp without time zone,
    customer_id integer,
    site_id integer,
    company_id integer,
    service_id integer
);


ALTER TABLE public.site_items OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 42182)
-- Name: sites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sites_id_seq OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 17147)
-- Name: sites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sites (
    id integer DEFAULT nextval('public.sites_id_seq'::regclass) NOT NULL,
    name character varying(200),
    location character varying(300),
    address_name character varying(300),
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    description character varying(500),
    client_id integer,
    check_in_distance integer
);


ALTER TABLE public.sites OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 17153)
-- Name: staff; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff (
    user_id integer NOT NULL,
    start_date timestamp without time zone,
    ratings smallint,
    company_name character varying(300)
);


ALTER TABLE public.staff OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 17157)
-- Name: task_shift_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_shift_logs (
    id integer NOT NULL,
    task_id integer,
    shift_id character varying(50),
    created_at timestamp without time zone,
    type character varying(200),
    type_value character varying(100),
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    status smallint,
    updated_by integer,
    updated_at timestamp without time zone,
    created_by integer,
    task_name character varying(300),
    shift_name character varying(300),
    action character varying(100),
    task_shift_id integer
);


ALTER TABLE public.task_shift_logs OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 17163)
-- Name: task_shift_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_shift_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_shift_logs_id_seq OWNER TO postgres;

--
-- TOC entry 5503 (class 0 OID 0)
-- Dependencies: 244
-- Name: task_shift_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_shift_logs_id_seq OWNED BY public.task_shift_logs.id;


--
-- TOC entry 245 (class 1259 OID 17164)
-- Name: task_shifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_shifts (
    id integer NOT NULL,
    task_id integer,
    created_at timestamp without time zone,
    "from" time without time zone,
    "to" time without time zone,
    reminder_times smallint DEFAULT 0,
    reminder_day character varying(100)
);


ALTER TABLE public.task_shifts OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 17169)
-- Name: task_shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_shifts_id_seq OWNER TO postgres;

--
-- TOC entry 5504 (class 0 OID 0)
-- Dependencies: 246
-- Name: task_shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_shifts_id_seq OWNED BY public.task_shifts.id;


--
-- TOC entry 247 (class 1259 OID 17170)
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    name character varying(300),
    site_item_id integer,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    description character varying(500),
    report_template_id integer,
    status smallint,
    "order" smallint,
    staff_id integer,
    type character varying(200),
    type_value character varying(100),
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    reminder_times smallint DEFAULT 0,
    reminder_day character varying(100)
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 17177)
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasks_id_seq OWNER TO postgres;

--
-- TOC entry 5505 (class 0 OID 0)
-- Dependencies: 248
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- TOC entry 249 (class 1259 OID 17178)
-- Name: ticket_answers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_answers (
    id integer NOT NULL,
    ticket_id integer,
    message text,
    created_at timestamp without time zone,
    user_id integer,
    updated_at timestamp without time zone,
    created_by integer,
    updated_by integer,
    type integer NOT NULL,
    attach_files character varying(5000)
);


ALTER TABLE public.ticket_answers OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 17185)
-- Name: ticket_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ticket_answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ticket_answers_id_seq OWNER TO postgres;

--
-- TOC entry 5506 (class 0 OID 0)
-- Dependencies: 250
-- Name: ticket_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ticket_answers_id_seq OWNED BY public.ticket_answers.id;


--
-- TOC entry 251 (class 1259 OID 17186)
-- Name: tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tickets (
    id integer NOT NULL,
    customer_id integer,
    site_id integer,
    priority integer,
    message text,
    attach_files character varying(5000),
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    status smallint,
    subject character varying(300),
    service_name character varying(300),
    site_name character varying(300),
    customer_name character varying(300),
    sender smallint,
    company_name character varying(300),
    service_id integer
);


ALTER TABLE public.tickets OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 17192)
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tickets_id_seq OWNER TO postgres;

--
-- TOC entry 5507 (class 0 OID 0)
-- Dependencies: 252
-- Name: tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;


--
-- TOC entry 253 (class 1259 OID 17193)
-- Name: user_daily_job_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_daily_job_items (
    id integer NOT NULL,
    user_daily_job_id integer,
    created_at timestamp without time zone,
    type smallint,
    check_in timestamp without time zone,
    check_out timestamp without time zone
);


ALTER TABLE public.user_daily_job_items OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 17197)
-- Name: user_daily_job_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_daily_job_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_daily_job_items_id_seq OWNER TO postgres;

--
-- TOC entry 5508 (class 0 OID 0)
-- Dependencies: 254
-- Name: user_daily_job_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_daily_job_items_id_seq OWNED BY public.user_daily_job_items.id;


--
-- TOC entry 255 (class 1259 OID 17198)
-- Name: user_daily_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_daily_jobs (
    id integer NOT NULL,
    site_id integer,
    site_location character varying(100),
    staff_id integer,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    date timestamp without time zone
);


ALTER TABLE public.user_daily_jobs OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 17202)
-- Name: user_daily_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_daily_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_daily_jobs_id_seq OWNER TO postgres;

--
-- TOC entry 5509 (class 0 OID 0)
-- Dependencies: 256
-- Name: user_daily_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_daily_jobs_id_seq OWNED BY public.user_daily_jobs.id;


--
-- TOC entry 257 (class 1259 OID 17203)
-- Name: user_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_groups (
    user_id integer NOT NULL,
    group_id character varying(100) NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.user_groups OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 17213)
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_roles_id_seq OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 17208)
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id integer DEFAULT nextval('public.user_roles_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    role_id character varying(100),
    created_at timestamp without time zone
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- TOC entry 289 (class 1259 OID 44609)
-- Name: user_task_admin_visibility; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_task_admin_visibility (
    id integer NOT NULL,
    user_task_id integer NOT NULL,
    user_id integer NOT NULL,
    badge_dismissed_at timestamp without time zone
);


ALTER TABLE public.user_task_admin_visibility OWNER TO postgres;

--
-- TOC entry 288 (class 1259 OID 44608)
-- Name: user_task_admin_visibility_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_task_admin_visibility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_task_admin_visibility_id_seq OWNER TO postgres;

--
-- TOC entry 5510 (class 0 OID 0)
-- Dependencies: 288
-- Name: user_task_admin_visibility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_task_admin_visibility_id_seq OWNED BY public.user_task_admin_visibility.id;


--
-- TOC entry 287 (class 1259 OID 44470)
-- Name: user_task_customer_visibility; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_task_customer_visibility (
    id integer NOT NULL,
    user_task_id integer NOT NULL,
    user_id integer NOT NULL,
    hidden_at timestamp without time zone,
    badge_dismissed_at timestamp without time zone,
    opened_at timestamp without time zone,
    cleared_at timestamp without time zone
);


ALTER TABLE public.user_task_customer_visibility OWNER TO postgres;

--
-- TOC entry 286 (class 1259 OID 44469)
-- Name: user_task_customer_visibility_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_task_customer_visibility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_task_customer_visibility_id_seq OWNER TO postgres;

--
-- TOC entry 5511 (class 0 OID 0)
-- Dependencies: 286
-- Name: user_task_customer_visibility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_task_customer_visibility_id_seq OWNED BY public.user_task_customer_visibility.id;


--
-- TOC entry 282 (class 1259 OID 42377)
-- Name: user_task_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_task_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_task_reports_id_seq OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 17214)
-- Name: user_task_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_task_reports (
    id integer DEFAULT nextval('public.user_task_reports_id_seq'::regclass) NOT NULL,
    name character varying(300),
    type character varying(100),
    created_at timestamp without time zone,
    value text,
    user_task_id integer,
    "order" smallint
);


ALTER TABLE public.user_task_reports OWNER TO postgres;

--
-- TOC entry 5512 (class 0 OID 0)
-- Dependencies: 260
-- Name: COLUMN user_task_reports.value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_task_reports.value IS 'Template field value; IMAGES/VIDEOS may store a JSON array of file URLs.';


--
-- TOC entry 281 (class 1259 OID 42236)
-- Name: user_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_tasks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_tasks_id_seq OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 17227)
-- Name: user_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_tasks (
    id integer DEFAULT nextval('public.user_tasks_id_seq'::regclass) NOT NULL,
    created_at timestamp without time zone,
    status smallint,
    staff_id integer,
    updated_at timestamp without time zone,
    task_shift_id integer,
    task_id integer,
    task_name character varying(200),
    site_id integer,
    site_name character varying(200),
    site_address character varying(300),
    service_name character varying(200),
    report_template_id integer,
    description character varying(300),
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    customer_id integer,
    customer_name character varying(300),
    notifies_staff smallint,
    type character varying(50),
    created_by integer,
    updated_by integer,
    site_location character varying(200),
    company_name character varying(300),
    check_in timestamp without time zone,
    check_out timestamp without time zone,
    images character varying(10000),
    pdf_file character varying(1000),
    admin_opened_at timestamp without time zone,
    customer_opened_at timestamp without time zone,
    staff_opened_at timestamp without time zone,
    admin_dashboard_dismissed_at timestamp without time zone,
    customer_dashboard_dismissed_at timestamp without time zone,
    service_id integer,
    cleared_at timestamp without time zone
);


ALTER TABLE public.user_tasks OWNER TO postgres;

--
-- TOC entry 5513 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN user_tasks.admin_opened_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_tasks.admin_opened_at IS 'Set when admin views the report; NULL = unread on dashboard (CUSTOM staff reports).';


--
-- TOC entry 5514 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN user_tasks.customer_opened_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_tasks.customer_opened_at IS 'Set when customer views staff-submitted CUSTOM report; NULL = unread on customer dashboard.';


--
-- TOC entry 262 (class 1259 OID 17240)
-- Name: user_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_tokens (
    id integer NOT NULL,
    user_key character varying(50) NOT NULL,
    token character varying(200),
    status smallint,
    type smallint,
    expired timestamp without time zone,
    ip character varying(20),
    os character varying(10),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.user_tokens OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 17245)
-- Name: user_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_tokens_id_seq OWNER TO postgres;

--
-- TOC entry 5515 (class 0 OID 0)
-- Dependencies: 263
-- Name: user_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_tokens_id_seq OWNED BY public.user_tokens.id;


--
-- TOC entry 264 (class 1259 OID 17246)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(200),
    email character varying(100),
    password character varying(100),
    full_name character varying(200),
    status smallint,
    last_login timestamp without time zone,
    last_version character varying(10),
    type smallint DEFAULT 1,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by integer,
    updated_by integer,
    avatar character varying(255),
    phone character varying(20),
    gender character varying(10),
    dob timestamp without time zone,
    address character varying(300),
    first_name character varying(100),
    last_name character varying(100),
    "position" character varying(100),
    allow_delete smallint DEFAULT 2
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 17260)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5516 (class 0 OID 0)
-- Dependencies: 265
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 5099 (class 2604 OID 41555)
-- Name: customer_admin_message_deletions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_admin_message_deletions ALTER COLUMN id SET DEFAULT nextval('public.customer_admin_message_deletions_id_seq'::regclass);


--
-- TOC entry 5097 (class 2604 OID 41376)
-- Name: customer_admin_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_admin_messages ALTER COLUMN id SET DEFAULT nextval('public.customer_admin_messages_id_seq'::regclass);


--
-- TOC entry 5094 (class 2604 OID 41359)
-- Name: customer_admin_threads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_admin_threads ALTER COLUMN id SET DEFAULT nextval('public.customer_admin_threads_id_seq'::regclass);


--
-- TOC entry 5103 (class 2604 OID 43195)
-- Name: customer_companies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_companies ALTER COLUMN id SET DEFAULT nextval('public.customer_companies_id_seq'::regclass);


--
-- TOC entry 5061 (class 2604 OID 24821)
-- Name: items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items ALTER COLUMN id SET DEFAULT nextval('public.items_id_seq'::regclass);


--
-- TOC entry 5064 (class 2604 OID 24822)
-- Name: logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs ALTER COLUMN id SET DEFAULT nextval('public.logs_id_seq'::regclass);


--
-- TOC entry 5107 (class 2604 OID 44631)
-- Name: report_fault_admin_visibility id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_fault_admin_visibility ALTER COLUMN id SET DEFAULT nextval('public.report_fault_admin_visibility_id_seq'::regclass);


--
-- TOC entry 5108 (class 2604 OID 44915)
-- Name: report_fault_customer_visibility id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_fault_customer_visibility ALTER COLUMN id SET DEFAULT nextval('public.report_fault_customer_visibility_id_seq'::regclass);


--
-- TOC entry 5101 (class 2604 OID 42016)
-- Name: report_template_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_template_categories ALTER COLUMN id SET DEFAULT nextval('public.report_template_categories_id_seq'::regclass);


--
-- TOC entry 5060 (class 2604 OID 43852)
-- Name: services id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- TOC entry 5077 (class 2604 OID 24824)
-- Name: task_shift_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_shift_logs ALTER COLUMN id SET DEFAULT nextval('public.task_shift_logs_id_seq'::regclass);


--
-- TOC entry 5078 (class 2604 OID 24825)
-- Name: task_shifts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_shifts ALTER COLUMN id SET DEFAULT nextval('public.task_shifts_id_seq'::regclass);


--
-- TOC entry 5080 (class 2604 OID 24826)
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- TOC entry 5082 (class 2604 OID 24827)
-- Name: ticket_answers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_answers ALTER COLUMN id SET DEFAULT nextval('public.ticket_answers_id_seq'::regclass);


--
-- TOC entry 5083 (class 2604 OID 24828)
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- TOC entry 5084 (class 2604 OID 24829)
-- Name: user_daily_job_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_daily_job_items ALTER COLUMN id SET DEFAULT nextval('public.user_daily_job_items_id_seq'::regclass);


--
-- TOC entry 5085 (class 2604 OID 24830)
-- Name: user_daily_jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_daily_jobs ALTER COLUMN id SET DEFAULT nextval('public.user_daily_jobs_id_seq'::regclass);


--
-- TOC entry 5106 (class 2604 OID 44612)
-- Name: user_task_admin_visibility id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_task_admin_visibility ALTER COLUMN id SET DEFAULT nextval('public.user_task_admin_visibility_id_seq'::regclass);


--
-- TOC entry 5105 (class 2604 OID 44473)
-- Name: user_task_customer_visibility id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_task_customer_visibility ALTER COLUMN id SET DEFAULT nextval('public.user_task_customer_visibility_id_seq'::regclass);


--
-- TOC entry 5089 (class 2604 OID 24833)
-- Name: user_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tokens ALTER COLUMN id SET DEFAULT nextval('public.user_tokens_id_seq'::regclass);


--
-- TOC entry 5090 (class 2604 OID 24834)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5463 (class 0 OID 41552)
-- Dependencies: 273
-- Data for Name: customer_admin_message_deletions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_admin_message_deletions (id, message_id, user_id, deleted_at, purged_at) FROM stdin;
1	9	139	2026-05-20 10:13:17.592526	2026-05-20 10:37:24.739
2	11	139	2026-05-20 10:37:10.301347	2026-05-20 10:37:24.739
4	8	139	2026-05-20 10:40:52.13348	2026-05-20 10:41:05.872
5	6	139	2026-05-20 10:42:08.93927	2026-05-20 10:57:34.262
6	2	139	2026-05-20 11:02:19.278664	2026-05-20 11:02:45.088
7	13	141	2026-05-21 14:04:55.909216	\N
9	4	142	2026-05-21 14:05:31.862681	2026-05-21 14:05:41.77
8	13	142	2026-05-21 14:05:14.012922	2026-05-21 14:05:57.933
10	4	140	2026-05-21 15:07:46.42275	2026-05-22 09:12:11.783
11	12	142	2026-05-25 16:06:57.915346	\N
12	23	140	2026-05-28 11:23:58.844216	2026-05-28 11:24:02.964
13	22	145	2026-05-28 13:19:05.804993	2026-05-28 13:19:11.612
14	35	142	2026-05-28 13:19:36.474305	2026-05-28 13:19:41.875
15	44	142	2026-05-29 10:03:24.452416	2026-05-29 10:03:37.542
16	41	142	2026-05-29 10:03:27.545741	2026-05-29 10:03:37.542
\.


--
-- TOC entry 5461 (class 0 OID 41373)
-- Dependencies: 271
-- Data for Name: customer_admin_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_admin_messages (id, thread_id, sender_id, sender_type, body, report_fault_id, report_reference, created_at, user_task_id, attach_files) FROM stdin;
1	1	139	1	hy moses	\N	\N	2026-05-19 14:26:53.249073	\N	\N
2	1	139	1	📋 Report #95: Gajuga park \nView report: /report-faults?faultId=95\nSite: Bayside Public Amenities · Public Amenities Cleaning\n────────────────────\n\nHello, I have a question about this report fault.	95	Report #95: Gajuga park 	2026-05-19 14:27:33.71077	\N	\N
4	2	142	3	hi	\N	\N	2026-05-19 14:48:04.125893	\N	\N
5	1	139	1	Hello, I have a question about this new report.	\N	\N	2026-05-19 15:17:57.711027	\N	\N
6	1	139	1	Hello, I have a question about this new report.	\N	\N	2026-05-20 09:21:04.078362	\N	\N
7	1	139	1	📋 New report #212: Daily cleaning services\nView report: /new-reports?reportId=212\nSite: Bayside Public Amenities · Public Amenities Cleaning\n────────────────────\n\nddddddddddddddddddddddddd	\N	New report #212: Daily cleaning services	2026-05-20 09:27:30.273023	212	\N
8	1	139	1	📋 Fault report #92: Botany road mascot \nView report: /report-faults?faultId=92\nSite: Mascot Public Amenities · Public Amenities Cleaning\n────────────────────\n\nhhhhhhhhhhhhhhhhhhhhhhhhhhhh	92	Fault report #92: Botany road mascot 	2026-05-20 09:28:41.800018	\N	\N
10	1	142	3	whyt	\N	\N	2026-05-20 09:37:09.81905	\N	\N
11	1	139	1	hi	\N	\N	2026-05-20 09:38:56.576228	\N	\N
12	1	139	1	📎 Attachment	\N	\N	2026-05-20 10:48:30.424373	\N	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-20/1779238098409-WhatsApp_Image_2025-05-26_at_11.29.50_6a92d8ff.jpg"]
13	3	142	3	hi	\N	\N	2026-05-21 14:04:33.628658	\N	\N
14	1	139	1	📋 New report #247: New Report - 2026-05-21\nView report: /new-reports?reportId=247\nSite: Bayside Public Amenities · Public Amenities Cleaning\n────────────────────\n\nhi	\N	New report #247: New Report - 2026-05-21	2026-05-22 09:34:53.042437	\N	\N
3	1	139	1	📋 New report #234: New Report - 2026-05-14\nView report: /new-reports?reportId=234\nSite: Mascot Public Amenities · Public Amenities Cleaning\n────────────────────\n\nHello, I have a question about this new report.	\N	New report #234: New Report - 2026-05-14	2026-05-19 14:32:58.899271	\N	\N
9	1	139	1	📋 New report #234: New Report - 2026-05-14\nView report: /new-reports?reportId=234\nSite: Mascot Public Amenities · Public Amenities Cleaning\n────────────────────\n\niiiiiiiiii	\N	New report #234: New Report - 2026-05-14	2026-05-20 09:36:00.141539	\N	\N
15	1	142	3	hi	\N	\N	2026-05-25 16:07:37.335535	\N	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-25/1779689252726-WhatsApp_Image_2025-05-26_at_11.29.50_4fccfbbc.jpg"]
16	5	142	3	hi	\N	\N	2026-05-25 16:07:37.348182	\N	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-25/1779689252726-WhatsApp_Image_2025-05-26_at_11.29.50_4fccfbbc.jpg"]
17	1	142	3	📋 Fault report #97: sss\nView report: /report-faults?faultId=97\nSite: Mascot Public Amenities · Public Amenities Cleaning\n────────────────────\n\nwhat this	97	Fault report #97: sss	2026-05-27 13:43:45.623984	\N	\N
18	5	142	3	📋 Fault report #97: sss\nView report: /report-faults?faultId=97\nSite: Mascot Public Amenities · Public Amenities Cleaning\n────────────────────\n\nwhat this	97	Fault report #97: sss	2026-05-27 13:43:45.639983	\N	\N
19	6	142	3	📋 Fault report #97: sss\nView report: /report-faults?faultId=97\nSite: Mascot Public Amenities · Public Amenities Cleaning\n────────────────────\n\nwhat this	97	Fault report #97: sss	2026-05-27 13:43:45.653281	\N	\N
23	2	142	3	hi	\N	\N	2026-05-28 11:23:38.107685	\N	\N
24	1	139	1	hi alex	\N	\N	2026-05-28 12:09:12.402123	\N	\N
25	5	139	1	hi alex	\N	\N	2026-05-28 12:09:12.410965	\N	\N
26	1	139	1	alexxxxxxxxxxxxxx	\N	\N	2026-05-28 12:11:08.112313	\N	\N
27	5	139	1	alexxxxxxxxxxxxxx	\N	\N	2026-05-28 12:11:08.120164	\N	\N
28	5	146	1	jjjjjjjjjjjjjj	\N	\N	2026-05-28 12:16:16.103899	\N	\N
29	1	146	1	jjjjjjjjjjjjjj	\N	\N	2026-05-28 12:16:16.116844	\N	\N
30	2	140	2	aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa	\N	\N	2026-05-28 12:20:17.263728	\N	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-28/1779934814818-WhatsApp_Image_2025-05-26_at_11.29.50_316e22fc.jpg"]
31	6	142	3	alex11111111111	\N	\N	2026-05-28 12:23:26.488959	\N	\N
32	5	142	3	alex11111111111	\N	\N	2026-05-28 12:23:26.501252	\N	\N
33	1	142	3	alex11111111111	\N	\N	2026-05-28 12:23:26.503573	\N	\N
34	4	142	3	patricia	\N	\N	2026-05-28 12:50:07.056613	\N	\N
35	6	142	3	11111111111111111	\N	\N	2026-05-28 13:18:14.373154	\N	\N
36	5	142	3	11111111111111111	\N	\N	2026-05-28 13:18:14.38824	\N	\N
37	1	142	3	11111111111111111	\N	\N	2026-05-28 13:18:14.394028	\N	\N
38	5	142	3	hi	\N	\N	2026-05-29 10:00:31.200505	\N	\N
39	6	142	3	hi	\N	\N	2026-05-29 10:00:31.211851	\N	\N
40	1	142	3	hi	\N	\N	2026-05-29 10:00:31.214783	\N	\N
41	5	142	3	hi	\N	\N	2026-05-29 10:03:09.519729	\N	\N
42	6	142	3	hi	\N	\N	2026-05-29 10:03:09.532591	\N	\N
43	1	142	3	hi	\N	\N	2026-05-29 10:03:09.536499	\N	\N
44	5	142	3	📎 Attachment	\N	\N	2026-05-29 10:03:20.504545	\N	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780012998435-WhatsApp_Image_2025-05-26_at_11.29.50_4fccfbbc.jpg"]
45	6	142	3	📎 Attachment	\N	\N	2026-05-29 10:03:20.611323	\N	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780012998435-WhatsApp_Image_2025-05-26_at_11.29.50_4fccfbbc.jpg"]
46	1	142	3	📎 Attachment	\N	\N	2026-05-29 10:03:20.614173	\N	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780012998435-WhatsApp_Image_2025-05-26_at_11.29.50_4fccfbbc.jpg"]
20	1	139	1	📋 New report #228: New Report - 2026-05-28\nView report: /new-reports?reportId=228\nSite: Bayside Public Amenities · Public Amenities Cleaning\n────────────────────\n\nhi moses	\N	New report #228: New Report - 2026-05-28	2026-05-28 11:18:26.133337	\N	\N
21	5	139	1	📋 New report #228: New Report - 2026-05-28\nView report: /new-reports?reportId=228\nSite: Bayside Public Amenities · Public Amenities Cleaning\n────────────────────\n\nhi moses	\N	New report #228: New Report - 2026-05-28	2026-05-28 11:18:26.140072	\N	\N
22	6	139	1	📋 New report #228: New Report - 2026-05-28\nView report: /new-reports?reportId=228\nSite: Bayside Public Amenities · Public Amenities Cleaning\n────────────────────\n\nhi moses	\N	New report #228: New Report - 2026-05-28	2026-05-28 11:18:26.142298	\N	\N
\.


--
-- TOC entry 5459 (class 0 OID 41356)
-- Dependencies: 269
-- Data for Name: customer_admin_threads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_admin_threads (id, customer_id, customer_last_read_at, admin_last_read_at, last_message_preview, created_at, updated_at, staff_id, staff_last_read_at, peer_staff_id) FROM stdin;
1	139	2026-05-29 12:08:19.089	2026-05-29 09:56:05.752	📎 Attachment	2026-05-19 14:26:37.894539	2026-05-29 12:08:19.09111	\N	\N	\N
6	145	2026-05-28 13:19:05.831	2026-05-29 09:55:24.674	📎 Attachment	2026-05-27 13:43:45.643868	2026-05-29 10:03:20.611	\N	\N	\N
5	146	2026-05-28 12:16:16.159	2026-05-29 10:03:32.383	📎 Attachment	2026-05-25 14:39:08.087012	2026-05-29 10:03:32.385626	\N	\N	\N
2	\N	\N	2026-05-29 10:02:44.725	aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa	2026-05-19 14:47:52.580773	2026-05-29 12:04:40.376192	140	2026-05-29 12:04:40.374	\N
4	136	2026-05-28 12:52:13.592	2026-05-28 12:50:07.148	patricia	2026-05-22 12:22:48.205017	2026-05-28 12:52:13.593183	\N	\N	\N
3	\N	\N	2026-05-28 12:31:06.039	hi	2026-05-21 14:04:27.574102	2026-05-29 11:04:21.025258	141	2026-05-29 11:04:21.023	\N
\.


--
-- TOC entry 5474 (class 0 OID 43192)
-- Dependencies: 284
-- Data for Name: customer_companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_companies (id, name, normalized_name, created_at) FROM stdin;
1	Bayside Council	bayside council	2026-05-25 11:29:07.066792+10
2	Inner West Council	inner west council	2026-05-25 11:29:07.066792+10
110	Hunter's Hill Council	hunter's hill council	2026-05-25 13:40:40.786345+10
\.


--
-- TOC entry 5412 (class 0 OID 17037)
-- Dependencies: 222
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customers (user_id, city, state, post_code, country, website, location, land_line, description, send_login_info, show_qr_code, company_name, company_phone, company_email, company_id) FROM stdin;
139	Sydney, Rockdale	New South Wales	 2216	Australia	https://www.bayside.nsw.gov.au/			Bayside City Council	2	2	Bayside Council	02 9562 1666	 council@bayside.nsw.gov.au	1
136	Sydney	New South Wales	 2049	Australia	https://www.innerwest.nsw.gov.au/			Inner West Facility Management oversees cleaning, maintenance, and consumables for public amenities, ensuring hygiene, safety, and operational efficiency.	2	2	Inner West Council	02 9392 5000	council@innerwest.nsw.gov.au	2
145	Sydney, Rockdale	New South Wales	 2216	Australia	https://www.bayside.nsw.gov.au/			Bayside City Council	0	2	Bayside Council	02 9562 1666	 council@bayside.nsw.gov.au	1
146	Sydney, Rockdale	New South Wales	 2216	Australia	https://www.bayside.nsw.gov.au/			Bayside City Council	0	2	Bayside Council	02 9562 1666	 council@bayside.nsw.gov.au	1
\.


--
-- TOC entry 5414 (class 0 OID 17049)
-- Dependencies: 224
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.groups (id, name, created_by, updated_by, created_at, updated_at, description, "order", service_id) FROM stdin;
\.


--
-- TOC entry 5415 (class 0 OID 17055)
-- Dependencies: 225
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.items (id, site_id, department_id, customer_id, created_at, config, required) FROM stdin;
\.


--
-- TOC entry 5417 (class 0 OID 17064)
-- Dependencies: 227
-- Data for Name: logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.logs (id, action, message, user_id, data, created_at, entity) FROM stdin;
\.


--
-- TOC entry 5419 (class 0 OID 17071)
-- Dependencies: 229
-- Data for Name: positions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.positions (id, name, created_by, updated_by, created_at, updated_at, description, "order") FROM stdin;
LEADER	Leader	1	112	2024-05-27 02:40:45	2024-05-27 19:12:13	\N	1
STAFF	Staff	1	1	2024-05-27 02:40:45	2024-05-26 09:14:59	\N	1
\.


--
-- TOC entry 5481 (class 0 OID 44628)
-- Dependencies: 291
-- Data for Name: report_fault_admin_visibility; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_fault_admin_visibility (id, report_fault_id, user_id, badge_dismissed_at) FROM stdin;
1	24	142	2026-05-25 15:44:40.988648
2	25	142	2026-05-25 15:44:40.988648
3	26	142	2026-05-25 15:44:40.988648
4	27	142	2026-05-25 15:44:40.988648
5	28	142	2026-05-25 15:44:40.988648
6	29	142	2026-05-25 15:44:40.988648
7	31	142	2026-05-25 15:44:40.988648
8	32	142	2026-05-25 15:44:40.988648
9	33	142	2026-05-25 15:44:40.988648
10	34	142	2026-05-25 15:44:40.988648
11	35	142	2026-05-25 15:44:40.988648
12	36	142	2026-05-25 15:44:40.988648
13	37	142	2026-05-25 15:44:40.988648
14	38	142	2026-05-25 15:44:40.988648
15	39	142	2026-05-25 15:44:40.988648
16	40	142	2026-05-25 15:44:40.988648
17	41	142	2026-05-25 15:44:40.988648
18	61	142	2026-05-25 15:44:40.988648
19	42	142	2026-05-25 15:44:40.988648
20	43	142	2026-05-25 15:44:40.988648
21	44	142	2026-05-25 15:44:40.988648
22	45	142	2026-05-25 15:44:40.988648
23	46	142	2026-05-25 15:44:40.988648
24	48	142	2026-05-25 15:44:40.988648
25	50	142	2026-05-25 15:44:40.988648
26	51	142	2026-05-25 15:44:40.988648
27	52	142	2026-05-25 15:44:40.988648
28	53	142	2026-05-25 15:44:40.988648
29	55	142	2026-05-25 15:44:40.988648
30	56	142	2026-05-25 15:44:40.988648
31	57	142	2026-05-25 15:44:40.988648
32	58	142	2026-05-25 15:44:40.988648
33	59	142	2026-05-25 15:44:40.988648
34	62	142	2026-05-25 15:44:40.988648
35	60	142	2026-05-25 15:44:40.988648
36	63	142	2026-05-25 15:44:40.988648
37	64	142	2026-05-25 15:44:40.988648
38	65	142	2026-05-25 15:44:40.988648
39	66	142	2026-05-25 15:44:40.988648
40	75	142	2026-05-25 15:44:40.988648
41	77	142	2026-05-25 15:44:40.988648
42	78	142	2026-05-25 15:44:40.988648
43	86	142	2026-05-25 15:44:40.988648
44	87	142	2026-05-25 15:44:40.988648
45	88	142	2026-05-25 15:44:40.988648
48	81	142	2026-05-25 15:44:40.988648
49	82	142	2026-05-25 15:44:40.988648
50	49	142	2026-05-25 15:44:40.988648
51	67	142	2026-05-25 15:44:40.988648
52	68	142	2026-05-25 15:44:40.988648
53	70	142	2026-05-25 15:44:40.988648
54	71	142	2026-05-25 15:44:40.988648
55	72	142	2026-05-25 15:44:40.988648
56	73	142	2026-05-25 15:44:40.988648
57	74	142	2026-05-25 15:44:40.988648
58	79	142	2026-05-25 15:44:40.988648
59	80	142	2026-05-25 15:44:40.988648
60	83	142	2026-05-25 15:44:40.988648
61	84	142	2026-05-25 15:44:40.988648
62	47	142	2026-05-25 15:44:40.988648
63	89	142	2026-05-25 15:44:40.988648
65	92	142	2026-05-25 15:44:40.988648
66	54	142	2026-05-25 15:44:40.988648
68	97	142	2026-05-25 15:44:40.988648
69	30	142	2026-05-25 15:44:40.988648
70	69	142	2026-05-25 15:44:40.988648
71	85	142	2026-05-25 15:44:40.988648
72	24	150	2026-05-29 10:15:48.468404
73	25	150	2026-05-29 10:15:48.468404
74	26	150	2026-05-29 10:15:48.468404
75	27	150	2026-05-29 10:15:48.468404
76	28	150	2026-05-29 10:15:48.468404
77	29	150	2026-05-29 10:15:48.468404
78	31	150	2026-05-29 10:15:48.468404
79	32	150	2026-05-29 10:15:48.468404
80	33	150	2026-05-29 10:15:48.468404
81	34	150	2026-05-29 10:15:48.468404
82	35	150	2026-05-29 10:15:48.468404
83	36	150	2026-05-29 10:15:48.468404
84	37	150	2026-05-29 10:15:48.468404
85	38	150	2026-05-29 10:15:48.468404
86	39	150	2026-05-29 10:15:48.468404
87	40	150	2026-05-29 10:15:48.468404
88	41	150	2026-05-29 10:15:48.468404
89	61	150	2026-05-29 10:15:48.468404
90	42	150	2026-05-29 10:15:48.468404
91	43	150	2026-05-29 10:15:48.468404
92	44	150	2026-05-29 10:15:48.468404
93	45	150	2026-05-29 10:15:48.468404
94	46	150	2026-05-29 10:15:48.468404
95	48	150	2026-05-29 10:15:48.468404
96	50	150	2026-05-29 10:15:48.468404
97	51	150	2026-05-29 10:15:48.468404
98	52	150	2026-05-29 10:15:48.468404
99	53	150	2026-05-29 10:15:48.468404
100	55	150	2026-05-29 10:15:48.468404
101	56	150	2026-05-29 10:15:48.468404
102	57	150	2026-05-29 10:15:48.468404
103	58	150	2026-05-29 10:15:48.468404
104	59	150	2026-05-29 10:15:48.468404
105	62	150	2026-05-29 10:15:48.468404
106	60	150	2026-05-29 10:15:48.468404
107	63	150	2026-05-29 10:15:48.468404
108	64	150	2026-05-29 10:15:48.468404
109	65	150	2026-05-29 10:15:48.468404
110	66	150	2026-05-29 10:15:48.468404
111	75	150	2026-05-29 10:15:48.468404
112	77	150	2026-05-29 10:15:48.468404
113	78	150	2026-05-29 10:15:48.468404
114	86	150	2026-05-29 10:15:48.468404
115	87	150	2026-05-29 10:15:48.468404
116	88	150	2026-05-29 10:15:48.468404
121	81	150	2026-05-29 10:15:48.468404
122	82	150	2026-05-29 10:15:48.468404
123	49	150	2026-05-29 10:15:48.468404
124	67	150	2026-05-29 10:15:48.468404
125	68	150	2026-05-29 10:15:48.468404
126	70	150	2026-05-29 10:15:48.468404
127	71	150	2026-05-29 10:15:48.468404
128	72	150	2026-05-29 10:15:48.468404
129	73	150	2026-05-29 10:15:48.468404
130	74	150	2026-05-29 10:15:48.468404
131	79	150	2026-05-29 10:15:48.468404
132	80	150	2026-05-29 10:15:48.468404
133	83	150	2026-05-29 10:15:48.468404
134	84	150	2026-05-29 10:15:48.468404
135	47	150	2026-05-29 10:15:48.468404
136	89	150	2026-05-29 10:15:48.468404
138	92	150	2026-05-29 10:15:48.468404
139	54	150	2026-05-29 10:15:48.468404
140	97	150	2026-05-29 10:15:48.468404
142	30	150	2026-05-29 10:15:48.468404
143	69	150	2026-05-29 10:15:48.468404
144	85	150	2026-05-29 10:15:48.468404
\.


--
-- TOC entry 5420 (class 0 OID 17077)
-- Dependencies: 230
-- Data for Name: report_fault_answers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_fault_answers (id, report_fault_id, message, created_at, user_id, updated_at, created_by, updated_by, type, attach_files) FROM stdin;
105	101	broken dor	2026-05-29 11:40:36.443	140	2026-05-29 11:40:36.443	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780018815362-WhatsApp_Image_2025-05-26_at_11.29.48_15e9727f.jpg"]
40	33	Disable toilet is blocked 	2025-09-25 22:39:48	140	2025-09-25 22:39:48	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758803965783_IMG-20250925-WA0069.jpg"]
31	24	Scarborough Park Production avenue \nUnisex blocked toilet 	2025-09-24 22:18:46	140	2025-09-24 22:18:46	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758716305146_IMG-20250924-WA0115.jpg"]
32	25	John curtin \nMale toilet has no lights \nFemale toilet blocked 	2025-09-24 22:24:33	140	2025-09-24 22:24:33	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758716667051_IMG-20250924-WA0112.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758716667056_IMG-20250924-WA0113.jpg"]
33	26	One of the Unisex toilet Blocked 	2025-09-24 22:39:39	140	2025-09-24 22:39:39	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758717571777_IMG-20250924-WA0147.jpg"]
34	27	Diable toilet \nBlocked 	2025-09-24 22:42:40	140	2025-09-24 22:42:40	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758717755196_IMG-20250924-WA0105.jpg"]
35	28	1-Despenser is broken in the diable toilet \n2-one of the Unisex toilet is blocked 	2025-09-24 22:46:09	140	2025-09-24 22:46:09	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758717961195_IMG-20250924-WA0104.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758717961190_IMG-20250924-WA0103.jpg"]
36	29	1- one if the despenser in the Unisex toilet is broken\n2-same toilet is blocked 	2025-09-25 22:28:08	140	2025-09-25 22:28:08	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758803268532_IMG-20250925-WA0003.jpg"]
37	30	1-one of the Unisex toilet is blocked \n2-despenser in the disable toilet is broken 	2025-09-25 22:30:52	140	2025-09-25 22:30:52	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758803445627_IMG-20250925-WA0062.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758803445633_IMG-20250925-WA0068.jpg"]
38	31	Male toilet is blocked 	2025-09-25 22:32:23	140	2025-09-25 22:32:23	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758803537551_IMG-20250925-WA0064.jpg"]
39	32	1-male toilet has NO Lights \n2-female toilet is blocked 	2025-09-25 22:34:42	140	2025-09-25 22:34:42	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758803677545_IMG-20250925-WA0067.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758803677550_IMG-20250925-WA0065.jpg"]
41	34	1-dispenser in the disable toilet is broken \n2-one of the Unisex toilet is blocked 	2025-09-25 22:43:04	140	2025-09-25 22:43:04	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758804177395_IMG-20250925-WA0002.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758804177401_IMG-20250925-WA0001.jpg"]
42	35	Disable toilet is blocked 	2025-09-26 23:57:39	140	2025-09-26 23:57:39	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895053762_IMG-20250926-WA0014.jpg"]
43	36	1-Despenser is broken in the disable toilet \n2-one of the Unisex toilet is blocked 	2025-09-27 00:02:19	140	2025-09-27 00:02:19	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895326831_IMG-20250926-WA0016.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895326836_IMG-20250926-WA0015.jpg"]
44	37	1-one of the Unisex toilet is blocked \n2-same toilet as above despenser is broken	2025-09-27 00:05:32	140	2025-09-27 00:05:32	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895527503_IMG-20250926-WA0013.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895527508_IMG-20250926-WA0012.jpg"]
45	38	1-no lights on the male toilet \n2-female toilets is blocked 	2025-09-27 00:07:14	140	2025-09-27 00:07:14	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895618866_IMG-20250926-WA0075.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895618858_IMG-20250926-WA0074.jpg"]
46	39	1- there is Graffiti on one of the Unisex toilet door \n2-one of the Unisex toilet is blocked and cleaner can't open  the door with the key 	2025-09-27 00:11:34	140	2025-09-27 00:11:34	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895881465_IMG-20250926-WA0076.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895881460_IMG-20250926-WA0073.jpg"]
47	40	Female toilet is blocked 	2025-09-27 00:13:02	140	2025-09-27 00:13:02	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895974275_IMG-20250926-WA0072.jpg"]
48	41	Disable toiletbis blocked 	2025-09-29 21:54:10	140	2025-09-29 21:54:10	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759146846490_IMG-20250929-WA0007.jpg"]
49	42	1-despenser in the disable toile is broken\n2-cubical number 4 door is closed cleaner can't open it something wrong with the locker 	2025-09-29 21:58:29	140	2025-09-29 21:58:29	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759147101512_IMG-20250929-WA0009.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759147101516_IMG-20250929-WA0008.jpg"]
50	43	Third last cubical with the different tiles than the others \nDespenser doesn't open need to be changed  	2025-09-29 22:08:02	140	2025-09-29 22:08:02	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759147628315_IMG-20250929-WA0024.jpg"]
51	44	Male toilet has no lights 	2025-09-29 22:41:24	140	2025-09-29 22:41:24	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759149657240_IMG-20250929-WA0117.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759149657235_IMG-20250929-WA0116.jpg"]
52	45	Disable toilet \nSome one was inside the toilet cleaner didn't clean the toilet 	2025-10-01 09:23:39	140	2025-10-01 09:23:39	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759274613193_IMG-20251001-WA0002.jpg"]
53	46	. Disable toilet Despenser is broken \n. One of the Unisex toilet is not opening \nDoor number 4 \n	2025-10-01 09:27:16	140	2025-10-01 09:27:16	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759274830254_IMG-20251001-WA0001.jpg"]
54	47	No lights 	2025-10-01 09:28:25	140	2025-10-01 09:28:25	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759274898600_IMG-20251001-WA0004.jpg"]
55	48	Disable toilet is blocked 	2025-10-01 09:29:41	140	2025-10-01 09:29:41	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759274976874_IMG-20251001-WA0000.jpg"]
56	49	3rd last toilet \nDespenser is broken plz change 	2025-10-01 09:36:35	140	2025-10-01 09:36:35	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759275384187_IMG-20251001-WA0003.jpg"]
57	50	Male toilet \n.Urinal bawl is  blocked \n.toilet is  blocked \n	2025-10-01 09:44:56	140	2025-10-01 09:44:56	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759275890917_IMG-20251001-WA0064.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759275890913_IMG-20251001-WA0063.jpg"]
58	51	One of the Unisex toilet is blocked 	2025-10-01 09:46:00	140	2025-10-01 09:46:00	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759275957102_IMG-20251001-WA0065.jpg"]
59	52	Male toilet \nNo lights 	2025-10-01 09:46:59	140	2025-10-01 09:46:59	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759276015635_IMG-20251001-WA0066.jpg"]
60	53	Last Door is not opening by key something wrong with the automatic lock 	2025-10-01 22:00:23	140	2025-10-01 22:00:23	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759320017187_IMG-20251001-WA0171.jpg"]
61	54	First disable toilet, door is not opening by key I think something wrong with the automatic lock\nsee vedio plz	2025-10-01 22:06:38	140	2025-10-01 22:06:38	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759320299549_VID-20251001-WA0172.mp4"]
62	55	Blockage in the disable toilet cleaner unblocked the diable toilet \nSee phottos 	2025-10-01 22:10:39	140	2025-10-01 22:10:39	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759320631490_IMG-20251001-WA0173.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759320631495_IMG-20251001-WA0174.jpg"]
63	56	° Dispenser is broken in the disable toilet \n° Unisex toilet number 5 Door is not opening something wrong with locker 	2025-10-01 22:14:27	140	2025-10-01 22:14:27	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759320863732_IMG-20251001-WA0176.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759320863734_IMG-20251001-WA0175.jpg"]
64	57	No lights at all \nSee photto plz 	2025-10-01 22:15:48	140	2025-10-01 22:15:48	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759320938536_IMG-20251001-WA0177.jpg"]
65	58	Male toilet has no lights 	2025-10-01 23:22:08	140	2025-10-01 23:22:08	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759324922226_IMG-20251001-WA0279.jpg"]
66	59	Blocked toilet and unblocked on site	2025-10-01 23:26:53	140	2025-10-01 23:26:53	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759325204440_IMG-20251001-WA0231.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759325204444_IMG-20251001-WA0232.jpg"]
67	60	Blocked toilet and unblocked on site 	2025-10-01 23:32:17	140	2025-10-01 23:32:17	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759325520928_IMG-20251001-WA0235.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759325520923_IMG-20251001-WA0233.jpg"]
68	61	Has been reported 3 times \nNo lights at all 	2025-10-02 23:29:48	140	2025-10-02 23:29:48	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759411779452_IMG-20251002-WA0106.jpg"]
69	62	Has been reported 3 times \nLast unisex toilet door is locked \nCleaner can't open it by key 	2025-10-02 23:32:34	140	2025-10-02 23:32:34	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759411945789_IMG-20251002-WA0105.jpg"]
70	63	Has been reported multiple of times \nMale toilet has no lights 	2025-10-02 23:40:22	140	2025-10-02 23:40:22	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759412400435_IMG-20251002-WA0193.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759412400431_IMG-20251002-WA0194.jpg"]
71	64	Female toilet lock dispenser is broken 	2025-10-05 23:39:42	140	2025-10-05 23:39:42	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759667979459_IMG-20251005-WA0034.jpg"]
72	65	Unisex door is not closing even by key\nSee vedio plz	2025-10-07 23:03:48	140	2025-10-07 23:03:48	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759838615600_VID-20251007-WA0001.mp4"]
73	66	Unisex toilet door number 6\nDespenser need to be change broken lock\nHas been reported before at least twice 	2025-10-07 23:08:32	140	2025-10-07 23:08:32	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759838903008_IMG-20251007-WA0004.jpg"]
74	67	Blocked toilet cleaner unblocked it	2025-10-07 23:10:35	140	2025-10-07 23:10:35	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759839027334_IMG-20251007-WA0002.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759839027338_IMG-20251007-WA0003.jpg"]
75	68	Disable toilet lock Despenser is broken 	2025-10-08 21:42:37	140	2025-10-08 21:42:37	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759920150756_IMG-20251008-WA0147.jpg"]
76	69	Unisex toilet door number 6 lock despenser is broken \nI Reported before 	2025-10-08 21:45:36	140	2025-10-08 21:45:36	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759920328515_IMG-20251008-WA0148.jpg"]
77	70	One of the disable toilet door is locked from inside \nHas been reported 3 times 	2025-10-08 22:53:13	140	2025-10-08 22:53:13	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759924375286_IMG-20251008-WA0267.jpg"]
78	71	2 Despenser locks are broken \nHas been reported before 	2025-10-08 22:56:09	140	2025-10-08 22:56:09	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759924564137_IMG-20251008-WA0219.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759924564133_IMG-20251008-WA0215.jpg"]
79	72	Botany road female toilet Despenser lock is broken 	2025-10-08 22:58:16	140	2025-10-08 22:58:16	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759924687366_IMG-20251008-WA0255.jpg"]
80	73	Unisex toilet door number 6 broken lock despenser has been reported several times 	2025-10-10 23:17:30	140	2025-10-10 23:17:30	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760098641980_IMG-20251010-WA0252.jpg"]
81	74	1 Female toilet Despenser is broken\nHas been reported several times   	2025-10-10 23:33:32	140	2025-10-10 23:33:32	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099608447_IMG-20251010-WA0251.jpg"]
82	75	* 2 despensers are broken in the Unisex toilet \n\n*disable shower room door is locked cleaner are not able to open it \n\nHas been reported several times 	2025-10-10 23:37:36	140	2025-10-10 23:37:36	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099850230_IMG-20251010-WA0198.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099850233_IMG-20251010-WA0187.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099850205_IMG-20251010-WA0193.jpg"]
84	77	Unisex toilet door number 6 despenser is broken \nHas been reported server times 	2025-10-12 23:44:06	140	2025-10-12 23:44:06	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273042274_IMG-20251012-WA0013.jpg"]
85	78	* Shower room disable toilet door is not opening cleaner can't clean this toilet \nHas been reported several time \n* 2 despensers in two unisex toilet need to be change broken locks \nHas been reported several times 	2025-10-12 23:51:55	140	2025-10-12 23:51:55	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273466869_IMG-20251012-WA0026.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273466864_IMG-20251012-WA0030.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273466871_IMG-20251012-WA0034.jpg"]
86	79	Female toilet one of the despensers need to be change broken lock \nHas been reported several times	2025-10-12 23:53:42	140	2025-10-12 23:53:42	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273613823_IMG-20251012-WA0075.jpg"]
87	80	Gardiner park \n* disable toilet despenser is broken \n* 1 of the Unisex toilet door number 6 despenser is broken\n	2025-10-13 22:23:06	140	2025-10-13 22:23:06	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760354580015_IMG-20251013-WA0011.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760354580021_IMG-20251013-WA0009.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760354580008_IMG-20251013-WA0010.jpg"]
88	81	Disable toilet \nBlocked toilet cleaner unblocked 	2025-10-13 22:24:28	140	2025-10-13 22:24:28	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760354663154_IMG-20251013-WA0008.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760354663159_IMG-20251013-WA0007.jpg"]
89	82	*Shower room disable toilet door is locked cleaner can't open the door to clean has been reported several times\n\n* 2 unisex toilets despensers are broken \nHas been reported several times 	2025-10-13 22:42:43	140	2025-10-13 22:42:43	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355757879_IMG-20251013-WA0123.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355757883_IMG-20251013-WA0126.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355757885_IMG-20251013-WA0129.jpg"]
90	83	Female toilet Despenser need to be changed broken lock \nHas been reported several times 	2025-10-13 22:43:48	140	2025-10-13 22:43:48	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355822570_IMG-20251013-WA0108.jpg"]
91	84	Gardiner park \n* Disable toilet Broken lock despenser \n* Unisex toilet door number 6 despenser is broken \nHas been reported before several times 	2025-10-14 22:14:36	140	2025-10-14 22:14:36	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760440472775_IMG-20251014-WA0029.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760440472779_IMG-20251014-WA0028.jpg"]
92	85	 Scarborough Park Production avenue \n*2 despensers need to be changed broken locks \n*Shower room disable toilet door is not opening cleaner can't clean it \nHas been reported several times 	2025-10-14 23:13:11	140	2025-10-14 23:13:11	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760443986525_IMG-20251014-WA0147.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760443986503_IMG-20251014-WA0146.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760443986531_IMG-20251014-WA0148.jpg"]
93	86	Female toilets despenser need to be changed broken lock 	2025-10-14 23:14:20	140	2025-10-14 23:14:20	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760444056773_IMG-20251014-WA0149.jpg"]
94	87	1-Shower room disable toilet door is not opening cleaner can't clean this toilet \n2-2 unisex toilet despensers need to be change broken locks 	2025-10-16 07:48:13	140	2025-10-16 07:48:13	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561289217_IMG-20251015-WA0073.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561289221_IMG-20251015-WA0071.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561289223_IMG-20251015-WA0072.jpg"]
95	88	1 of the Female toilets despenser need to be changed broken lock 	2025-10-16 07:50:28	140	2025-10-16 07:50:28	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561423227_IMG-20251015-WA0061.jpg"]
96	89	1) disable toilet Despenser need to be change broken lock \n2)one of the Unisex toilet door number 6 despenser need to be change broken lock\nHas been reported several times plus the reports in Scarborough Park Production avenue  also has  ren reported several times 	2025-10-16 08:01:32	140	2025-10-16 08:01:32	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562087238_IMG-20251015-WA0088.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562087242_IMG-20251015-WA0082.jpg"]
99	92	One of the femail cubical despenser need to be change  broken lock 	2025-10-17 08:14:23	140	2025-10-17 08:14:23	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649260415_IMG-20251016-WA0036.jpg"]
101	97	aaaaaaa	2026-05-20 13:14:11.415	140	2026-05-20 13:14:11.415	140	140	2	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-20/1779246849185-WhatsApp_Image_2025-05-26_at_11.29.50_6a255cf0.jpg"]
\.


--
-- TOC entry 5483 (class 0 OID 44912)
-- Dependencies: 293
-- Data for Name: report_fault_customer_visibility; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_fault_customer_visibility (id, report_fault_id, user_id, hidden_at, badge_dismissed_at, opened_at) FROM stdin;
369	101	139	\N	2026-05-29 12:09:08.143904	\N
72	24	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
144	24	145	\N	\N	2026-05-19 13:52:35.538828
1	24	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
73	25	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
147	25	145	\N	\N	2026-05-19 13:52:35.538828
2	25	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
74	26	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
150	26	145	\N	\N	2026-05-19 13:52:35.538828
3	26	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
75	27	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
153	27	145	\N	\N	2026-05-19 13:52:35.538828
4	27	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
76	28	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
156	28	145	\N	\N	2026-05-19 13:52:35.538828
5	28	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
77	29	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
159	29	145	\N	\N	2026-05-19 13:52:35.538828
6	29	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
78	31	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
162	31	145	\N	\N	2026-05-19 13:52:35.538828
7	31	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
79	32	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
165	32	145	\N	\N	2026-05-19 13:52:35.538828
8	32	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
80	33	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
168	33	145	\N	\N	2026-05-19 13:52:35.538828
9	33	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
81	34	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
171	34	145	\N	\N	2026-05-19 13:52:35.538828
10	34	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
82	35	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
174	35	145	\N	\N	2026-05-19 13:52:35.538828
11	35	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
83	36	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
177	36	145	\N	\N	2026-05-19 13:52:35.538828
12	36	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
84	37	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
180	37	145	\N	\N	2026-05-19 13:52:35.538828
13	37	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
85	38	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
183	38	145	\N	\N	2026-05-19 13:52:35.538828
14	38	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
86	39	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
186	39	145	\N	\N	2026-05-19 13:52:35.538828
15	39	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
87	40	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
189	40	145	\N	\N	2026-05-19 13:52:35.538828
16	40	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
88	41	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
192	41	145	\N	\N	2026-05-19 13:52:35.538828
17	41	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
89	61	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
195	61	145	\N	\N	2026-05-19 13:52:35.538828
18	61	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
90	42	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
198	42	145	\N	\N	2026-05-19 13:52:35.538828
19	42	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
91	43	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
201	43	145	\N	\N	2026-05-19 13:52:35.538828
20	43	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
92	44	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
204	44	145	\N	\N	2026-05-19 13:52:35.538828
21	44	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
93	45	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
207	45	145	\N	\N	2026-05-19 13:52:35.538828
22	45	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
94	46	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
210	46	145	\N	\N	2026-05-19 13:52:35.538828
23	46	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
95	48	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
213	48	145	\N	\N	2026-05-19 13:52:35.538828
24	48	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
96	50	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
216	50	145	\N	\N	2026-05-19 13:52:35.538828
25	50	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
97	51	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
219	51	145	\N	\N	2026-05-19 13:52:35.538828
26	51	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
98	52	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
222	52	145	\N	\N	2026-05-19 13:52:35.538828
27	52	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
99	53	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
225	53	145	\N	\N	2026-05-19 13:52:35.538828
28	53	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
100	55	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
228	55	145	\N	\N	2026-05-19 13:52:35.538828
29	55	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
101	56	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
231	56	145	\N	\N	2026-05-19 13:52:35.538828
30	56	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
102	57	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
234	57	145	\N	\N	2026-05-19 13:52:35.538828
31	57	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
103	58	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
237	58	145	\N	\N	2026-05-19 13:52:35.538828
32	58	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
104	59	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
240	59	145	\N	\N	2026-05-19 13:52:35.538828
33	59	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
105	62	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
243	62	145	\N	\N	2026-05-19 13:52:35.538828
34	62	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
106	60	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
246	60	145	\N	\N	2026-05-19 13:52:35.538828
35	60	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
107	63	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
249	63	145	\N	\N	2026-05-19 13:52:35.538828
36	63	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
108	64	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
252	64	145	\N	\N	2026-05-19 13:52:35.538828
37	64	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
109	65	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
255	65	145	\N	\N	2026-05-19 13:52:35.538828
38	65	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
110	66	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
258	66	145	\N	\N	2026-05-19 13:52:35.538828
39	66	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
111	75	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
261	75	145	\N	\N	2026-05-19 13:52:35.538828
40	75	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
112	77	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
264	77	145	\N	\N	2026-05-19 13:52:35.538828
41	77	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
113	78	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
267	78	145	\N	\N	2026-05-19 13:52:35.538828
42	78	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
114	86	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
270	86	145	\N	\N	2026-05-19 13:52:35.538828
43	86	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
115	87	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
273	87	145	\N	\N	2026-05-19 13:52:35.538828
44	87	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
116	88	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
276	88	145	\N	\N	2026-05-19 13:52:35.538828
45	88	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
281	95	139	\N	\N	2026-05-19 13:52:35.538828
282	95	145	\N	\N	2026-05-19 13:52:35.538828
283	95	146	\N	\N	2026-05-19 13:52:35.538828
287	96	139	\N	\N	2026-05-19 13:52:35.538828
288	96	145	\N	\N	2026-05-19 13:52:35.538828
289	96	146	\N	\N	2026-05-19 13:52:35.538828
119	81	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
291	81	145	\N	\N	2026-05-19 13:52:35.538828
48	81	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
120	82	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
294	82	145	\N	\N	2026-05-19 13:52:35.538828
49	82	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
121	49	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
297	49	145	\N	\N	2026-05-19 13:52:35.538828
50	49	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
122	67	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
300	67	145	\N	\N	2026-05-19 13:52:35.538828
51	67	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
123	68	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
303	68	145	\N	\N	2026-05-19 13:52:35.538828
52	68	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
124	70	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
306	70	145	\N	\N	2026-05-19 13:52:35.538828
53	70	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
125	71	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
309	71	145	\N	\N	2026-05-19 13:52:35.538828
54	71	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
126	72	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
312	72	145	\N	\N	2026-05-19 13:52:35.538828
55	72	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
127	73	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
315	73	145	\N	\N	2026-05-19 13:52:35.538828
56	73	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
128	74	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
318	74	145	\N	\N	2026-05-19 13:52:35.538828
57	74	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
129	79	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
321	79	145	\N	\N	2026-05-19 13:52:35.538828
58	79	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
130	80	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
324	80	145	\N	\N	2026-05-19 13:52:35.538828
59	80	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
131	83	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
327	83	145	\N	\N	2026-05-19 13:52:35.538828
60	83	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
132	84	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
330	84	145	\N	\N	2026-05-19 13:52:35.538828
61	84	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
133	47	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
333	47	145	\N	\N	2026-05-19 13:52:35.538828
62	47	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
134	89	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
336	89	145	\N	\N	2026-05-19 13:52:35.538828
63	89	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
136	92	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
342	92	145	\N	\N	2026-05-19 13:52:35.538828
65	92	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
137	54	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
345	54	145	\N	\N	2026-05-19 13:52:35.538828
66	54	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
139	97	139	\N	2026-05-25 16:28:54.715268	2026-05-22 09:30:58.759
351	97	145	\N	\N	2026-05-22 09:30:58.759
68	97	146	\N	2026-05-25 16:22:14.686536	2026-05-22 09:30:58.759
140	30	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
354	30	145	\N	\N	2026-05-19 13:52:35.538828
69	30	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
141	69	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
357	69	145	\N	\N	2026-05-19 13:52:35.538828
70	69	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
142	85	139	\N	2026-05-25 16:28:54.715268	2026-05-19 13:52:35.538828
360	85	145	\N	\N	2026-05-19 13:52:35.538828
71	85	146	\N	2026-05-25 16:22:14.686536	2026-05-19 13:52:35.538828
\.


--
-- TOC entry 5421 (class 0 OID 17092)
-- Dependencies: 231
-- Data for Name: report_faults; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_faults (id, customer_id, site_id, priority, message, attach_files, created_by, updated_by, created_at, updated_at, status, subject, service_name, site_name, customer_name, sender, company_name, staff_id, admin_opened_at, customer_opened_at, admin_dashboard_dismissed_at, customer_dashboard_dismissed_at, service_id, issue) FROM stdin;
24	139	37	2	Scarborough Park Production avenue \nUnisex blocked toilet 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758716305146_IMG-20250924-WA0115.jpg"]	140	140	2025-09-24 22:18:46	2025-09-24 22:18:46	2	Blockage 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
25	139	37	2	John curtin \nMale toilet has no lights \nFemale toilet blocked 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758716667051_IMG-20250924-WA0112.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758716667056_IMG-20250924-WA0113.jpg"]	140	140	2025-09-24 22:24:33	2025-09-24 22:24:33	2	Blockage and no lights 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
26	139	37	2	One of the Unisex toilet Blocked 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758717571777_IMG-20250924-WA0147.jpg"]	140	140	2025-09-24 22:39:39	2025-09-24 22:39:39	2	L Estrange Park 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
27	139	37	2	Diable toilet \nBlocked 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758717755196_IMG-20250924-WA0105.jpg"]	140	140	2025-09-24 22:42:40	2025-09-24 22:42:40	2	Rockdale park blocked toilet	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
28	139	37	2	1-Despenser is broken in the diable toilet \n2-one of the Unisex toilet is blocked 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758717961195_IMG-20250924-WA0104.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758717961190_IMG-20250924-WA0103.jpg"]	140	140	2025-09-24 22:46:09	2025-09-24 22:46:09	2	Ador Reserve 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
29	139	37	2	1- one if the despenser in the Unisex toilet is broken\n2-same toilet is blocked 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758803268532_IMG-20250925-WA0003.jpg"]	140	140	2025-09-25 22:28:08	2025-09-25 22:28:08	2	Scarborough Park Production avenue 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
31	139	37	2	Male toilet is blocked 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758803537551_IMG-20250925-WA0064.jpg"]	140	140	2025-09-25 22:32:23	2025-09-25 22:32:23	2	Mascot memorial park 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
32	139	37	2	1-male toilet has NO Lights \n2-female toilet is blocked 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758803677545_IMG-20250925-WA0067.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758803677550_IMG-20250925-WA0065.jpg"]	140	140	2025-09-25 22:34:42	2025-09-25 22:34:42	2	John curtin Reserve 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
33	139	37	2	Disable toilet is blocked 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758803965783_IMG-20250925-WA0069.jpg"]	140	140	2025-09-25 22:39:48	2025-09-25 22:39:48	2	Rockdale park 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
34	139	37	2	1-dispenser in the disable toilet is broken \n2-one of the Unisex toilet is blocked 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758804177395_IMG-20250925-WA0002.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758804177401_IMG-20250925-WA0001.jpg"]	140	140	2025-09-25 22:43:04	2025-09-25 22:43:04	2	Ador Reserve 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
35	139	37	2	Disable toilet is blocked 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895053762_IMG-20250926-WA0014.jpg"]	140	140	2025-09-26 23:57:39	2025-09-26 23:57:39	2	Rockdale park 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
36	139	37	2	1-Despenser is broken in the disable toilet \n2-one of the Unisex toilet is blocked 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895326831_IMG-20250926-WA0016.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895326836_IMG-20250926-WA0015.jpg"]	140	140	2025-09-27 00:02:19	2025-09-27 00:02:19	2	Ador Reserve 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
37	139	37	2	1-one of the Unisex toilet is blocked \n2-same toilet as above despenser is broken	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895527503_IMG-20250926-WA0013.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895527508_IMG-20250926-WA0012.jpg"]	140	140	2025-09-27 00:05:32	2025-09-27 00:05:32	2	Scarborough Park Production avenue 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
38	139	37	2	1-no lights on the male toilet \n2-female toilets is blocked 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895618866_IMG-20250926-WA0075.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895618858_IMG-20250926-WA0074.jpg"]	140	140	2025-09-27 00:07:14	2025-09-27 00:07:14	2	John curtin 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
39	139	37	2	1- there is Graffiti on one of the Unisex toilet door \n2-one of the Unisex toilet is blocked and cleaner can't open  the door with the key 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895881465_IMG-20250926-WA0076.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895881460_IMG-20250926-WA0073.jpg"]	140	140	2025-09-27 00:11:34	2025-09-27 00:11:34	2	L Estrange park	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
40	139	37	2	Female toilet is blocked 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758895974275_IMG-20250926-WA0072.jpg"]	140	140	2025-09-27 00:13:02	2025-09-27 00:13:02	2	Mascot memorial park 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
41	139	37	2	Disable toiletbis blocked 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759146846490_IMG-20250929-WA0007.jpg"]	140	140	2025-09-29 21:54:10	2025-09-29 21:54:10	2	Tonbridge Reserve 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
61	139	37	2	Has been reported 3 times \nNo lights at all 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759411779452_IMG-20251002-WA0106.jpg"]	140	140	2025-10-02 23:29:48	2025-10-02 23:29:48	2	Arncliffe Park 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
42	139	37	2	1-despenser in the disable toile is broken\n2-cubical number 4 door is closed cleaner can't open it something wrong with the locker 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759147101512_IMG-20250929-WA0009.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759147101516_IMG-20250929-WA0008.jpg"]	140	140	2025-09-29 21:58:29	2025-09-29 21:58:29	2	Ador Reserve 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
43	139	37	2	Third last cubical with the different tiles than the others \nDespenser doesn't open need to be changed  	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759147628315_IMG-20250929-WA0024.jpg"]	140	140	2025-09-29 22:08:02	2025-09-29 22:08:02	2	Gardiner Park	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
44	139	45	2	Male toilet has no lights 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759149657240_IMG-20250929-WA0117.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759149657235_IMG-20250929-WA0116.jpg"]	140	140	2025-09-29 22:41:24	2025-09-29 22:41:24	2	John Curtin Reserve 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
45	139	37	2	Disable toilet \nSome one was inside the toilet cleaner didn't clean the toilet 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759274613193_IMG-20251001-WA0002.jpg"]	140	140	2025-10-01 09:23:39	2025-10-01 09:23:39	2	Rockdale park 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
46	139	37	2	. Disable toilet Despenser is broken \n. One of the Unisex toilet is not opening \nDoor number 4 \n	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759274830254_IMG-20251001-WA0001.jpg"]	140	140	2025-10-01 09:27:16	2025-10-01 09:27:16	2	Ador Reserve 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
48	139	37	2	Disable toilet is blocked 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759274976874_IMG-20251001-WA0000.jpg"]	140	140	2025-10-01 09:29:41	2025-10-01 09:29:41	2	Tonbridge Reserve 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
50	139	45	2	Male toilet \n.Urinal bawl is  blocked \n.toilet is  blocked \n	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759275890917_IMG-20251001-WA0064.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759275890913_IMG-20251001-WA0063.jpg"]	140	140	2025-10-01 09:44:56	2025-10-01 09:44:56	2	Mascot memorial park 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
51	139	45	2	One of the Unisex toilet is blocked 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759275957102_IMG-20251001-WA0065.jpg"]	140	140	2025-10-01 09:46:00	2025-10-01 09:46:00	2	L Estrange park	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
52	139	45	2	Male toilet \nNo lights 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759276015635_IMG-20251001-WA0066.jpg"]	140	140	2025-10-01 09:46:59	2025-10-01 09:46:59	2	John curtin Reserve 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
53	139	37	2	Last Door is not opening by key something wrong with the automatic lock 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759320017187_IMG-20251001-WA0171.jpg"]	140	140	2025-10-01 22:00:23	2025-10-01 22:00:23	2	Scarborough Park Barton Street 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
55	139	37	2	Blockage in the disable toilet cleaner unblocked the diable toilet \nSee phottos 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759320631490_IMG-20251001-WA0173.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759320631495_IMG-20251001-WA0174.jpg"]	140	140	2025-10-01 22:10:39	2025-10-01 22:10:39	2	Tonbridge Reserve 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
56	139	37	2	° Dispenser is broken in the disable toilet \n° Unisex toilet number 5 Door is not opening something wrong with locker 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759320863732_IMG-20251001-WA0176.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759320863734_IMG-20251001-WA0175.jpg"]	140	140	2025-10-01 22:14:27	2025-10-01 22:14:27	2	Ador Reserve 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
57	139	37	2	No lights at all \nSee photto plz 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759320938536_IMG-20251001-WA0177.jpg"]	140	140	2025-10-01 22:15:48	2025-10-01 22:15:48	2	Arncliffe Park 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
58	139	45	2	Male toilet has no lights 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759324922226_IMG-20251001-WA0279.jpg"]	140	140	2025-10-01 23:22:08	2025-10-01 23:22:08	2	John curtin Reserve 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
59	139	45	2	Blocked toilet and unblocked on site	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759325204440_IMG-20251001-WA0231.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759325204444_IMG-20251001-WA0232.jpg"]	140	140	2025-10-01 23:26:53	2025-10-01 23:26:53	2	L Estrange park	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
62	139	37	2	Has been reported 3 times \nLast unisex toilet door is locked \nCleaner can't open it by key 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759411945789_IMG-20251002-WA0105.jpg"]	140	140	2025-10-02 23:32:34	2025-10-02 23:32:34	2	Scarborough Park Barton Street 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
60	139	45	2	Blocked toilet and unblocked on site 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759325520928_IMG-20251001-WA0235.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759325520923_IMG-20251001-WA0233.jpg"]	140	140	2025-10-01 23:32:17	2025-10-01 23:32:17	2	Mascot memorial park 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
63	139	45	2	Has been reported multiple of times \nMale toilet has no lights 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759412400435_IMG-20251002-WA0193.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759412400431_IMG-20251002-WA0194.jpg"]	140	140	2025-10-02 23:40:22	2025-10-02 23:40:22	2	John Curtin Reserve 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
64	139	45	2	Female toilet lock dispenser is broken 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759667979459_IMG-20251005-WA0034.jpg"]	140	140	2025-10-05 23:39:42	2025-10-05 23:39:42	2	Botany road mascot 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
65	139	37	2	Unisex door is not closing even by key\nSee vedio plz	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759838615600_VID-20251007-WA0001.mp4"]	140	140	2025-10-07 23:03:48	2025-10-07 23:03:48	2	Rockdale park 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
66	139	37	2	Unisex toilet door number 6\nDespenser need to be change broken lock\nHas been reported before at least twice 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759838903008_IMG-20251007-WA0004.jpg"]	140	140	2025-10-07 23:08:32	2025-10-07 23:08:32	2	Gardiner Park	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
75	139	45	2	* 2 despensers are broken in the Unisex toilet \n\n*disable shower room door is locked cleaner are not able to open it \n\nHas been reported several times 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099850230_IMG-20251010-WA0198.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099850233_IMG-20251010-WA0187.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099850205_IMG-20251010-WA0193.jpg"]	140	140	2025-10-10 23:37:36	2025-10-10 23:37:36	2	Scarborough Park Production avenue 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
77	139	37	2	Unisex toilet door number 6 despenser is broken \nHas been reported server times 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273042274_IMG-20251012-WA0013.jpg"]	140	140	2025-10-12 23:44:06	2025-10-12 23:44:06	2	Gardiner Park	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
78	139	45	2	* Shower room disable toilet door is not opening cleaner can't clean this toilet \nHas been reported several time \n* 2 despensers in two unisex toilet need to be change broken locks \nHas been reported several times 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273466869_IMG-20251012-WA0026.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273466864_IMG-20251012-WA0030.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273466871_IMG-20251012-WA0034.jpg"]	140	140	2025-10-12 23:51:55	2025-10-12 23:51:55	2	Scarborough Park Production avenue 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
86	139	45	2	Female toilets despenser need to be changed broken lock 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760444056773_IMG-20251014-WA0149.jpg"]	140	140	2025-10-14 23:14:20	2025-10-14 23:14:20	2	Botany road mascot 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
87	139	45	2	1-Shower room disable toilet door is not opening cleaner can't clean this toilet \n2-2 unisex toilet despensers need to be change broken locks 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561289217_IMG-20251015-WA0073.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561289221_IMG-20251015-WA0071.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561289223_IMG-20251015-WA0072.jpg"]	140	140	2025-10-16 07:48:13	2025-10-16 07:48:13	2	Scarborough Park Production avenue 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
88	139	45	2	1 of the Female toilets despenser need to be changed broken lock 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561423227_IMG-20251015-WA0061.jpg"]	140	140	2025-10-16 07:50:28	2025-10-16 07:50:28	2	Botany road mascot 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
101	139	\N	2	broken dor	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780018815362-WhatsApp_Image_2025-05-26_at_11.29.48_15e9727f.jpg"]	140	140	2026-05-29 11:40:36.395	2026-05-29 11:40:36.395	2	Graffiti	Public Amenities Cleaning	masot site	Jessica Bosevska	1	Bayside Council	140	\N	\N	\N	\N	4	Graffiti
95	139	37	1	On of the cubical door in male toilet is broken	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761568636516_IMG-20251027-WA0003.jpg"]	140	140	2025-10-27 23:37:22	2026-05-19 15:00:30.322	4	Gajuga park 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	3	Bayside Council	140	\N	2026-05-19 13:52:35.538828	\N	2026-05-19 13:52:35.538828	4	\N
96	139	45	1	xxx	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-19/1779160188451-WhatsApp_Image_2025-05-26_at_11.29.50_6a255cf0.jpg"]	140	140	2026-05-19 13:09:49.66	2026-05-19 15:00:28.022	4	sss	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	3	Bayside Council	140	\N	2026-05-19 13:52:35.538828	\N	2026-05-19 13:52:35.538828	4	\N
81	139	37	2	Disable toilet \nBlocked toilet cleaner unblocked 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760354663154_IMG-20251013-WA0008.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760354663159_IMG-20251013-WA0007.jpg"]	140	140	2025-10-13 22:24:28	2025-10-13 22:24:28	2	Rockdale park 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
82	139	45	2	*Shower room disable toilet door is locked cleaner can't open the door to clean has been reported several times\n\n* 2 unisex toilets despensers are broken \nHas been reported several times 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355757879_IMG-20251013-WA0123.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355757883_IMG-20251013-WA0126.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355757885_IMG-20251013-WA0129.jpg"]	140	140	2025-10-13 22:42:43	2025-10-13 22:42:43	2	Scarborough Park Production avenue 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
49	139	37	2	3rd last toilet \nDespenser is broken plz change 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759275384187_IMG-20251001-WA0003.jpg"]	140	140	2025-10-01 09:36:35	2025-10-01 09:36:35	2	Gardiner Park	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
67	139	37	2	Blocked toilet cleaner unblocked it	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759839027334_IMG-20251007-WA0002.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759839027338_IMG-20251007-WA0003.jpg"]	140	140	2025-10-07 23:10:35	2025-10-07 23:10:35	2	Gardiner Park	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
68	139	37	2	Disable toilet lock Despenser is broken 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759920150756_IMG-20251008-WA0147.jpg"]	140	140	2025-10-08 21:42:37	2025-10-08 21:42:37	2	Gardiner Park	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
70	139	45	2	One of the disable toilet door is locked from inside \nHas been reported 3 times 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759924375286_IMG-20251008-WA0267.jpg"]	140	140	2025-10-08 22:53:13	2025-10-08 22:53:13	2	Scarborough Park Production avenue 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
71	139	45	2	2 Despenser locks are broken \nHas been reported before 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759924564137_IMG-20251008-WA0219.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759924564133_IMG-20251008-WA0215.jpg"]	140	140	2025-10-08 22:56:09	2025-10-08 22:56:09	2	Scarborough Park Production avenue 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
72	139	45	2	Botany road female toilet Despenser lock is broken 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759924687366_IMG-20251008-WA0255.jpg"]	140	140	2025-10-08 22:58:16	2025-10-08 22:58:16	2	Botany road mascot 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
73	139	37	2	Unisex toilet door number 6 broken lock despenser has been reported several times 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760098641980_IMG-20251010-WA0252.jpg"]	140	140	2025-10-10 23:17:30	2025-10-10 23:17:30	2	Gardiner Park	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
74	139	45	2	1 Female toilet Despenser is broken\nHas been reported several times   	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099608447_IMG-20251010-WA0251.jpg"]	140	140	2025-10-10 23:33:32	2025-10-10 23:33:32	2	Botany road mascot 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
79	139	45	2	Female toilet one of the despensers need to be change broken lock \nHas been reported several times	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273613823_IMG-20251012-WA0075.jpg"]	140	140	2025-10-12 23:53:42	2025-10-12 23:53:42	2	Botany road mascot 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
80	139	37	2	Gardiner park \n* disable toilet despenser is broken \n* 1 of the Unisex toilet door number 6 despenser is broken\n	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760354580015_IMG-20251013-WA0011.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760354580021_IMG-20251013-WA0009.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760354580008_IMG-20251013-WA0010.jpg"]	140	140	2025-10-13 22:23:06	2025-10-13 22:23:06	2	Gardiner Park	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
83	139	45	2	Female toilet Despenser need to be changed broken lock \nHas been reported several times 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355822570_IMG-20251013-WA0108.jpg"]	140	140	2025-10-13 22:43:48	2025-10-13 22:43:48	2	Botany road mascot 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
84	139	37	2	Gardiner park \n* Disable toilet Broken lock despenser \n* Unisex toilet door number 6 despenser is broken \nHas been reported before several times 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760440472775_IMG-20251014-WA0029.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760440472779_IMG-20251014-WA0028.jpg"]	140	140	2025-10-14 22:14:36	2025-10-14 22:14:36	2	Gardiner Park	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
47	139	37	2	No lights 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759274898600_IMG-20251001-WA0004.jpg"]	140	140	2025-10-01 09:28:25	2025-10-01 09:28:25	2	Arncliffe Park 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
89	139	37	2	1) disable toilet Despenser need to be change broken lock \n2)one of the Unisex toilet door number 6 despenser need to be change broken lock\nHas been reported several times plus the reports in Scarborough Park Production avenue  also has  ren reported several times 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562087238_IMG-20251015-WA0088.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562087242_IMG-20251015-WA0082.jpg"]	140	140	2025-10-16 08:01:32	2025-10-16 08:01:32	2	Gardiner Park	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
92	139	45	2	One of the femail cubical despenser need to be change  broken lock 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649260415_IMG-20251016-WA0036.jpg"]	140	140	2025-10-17 08:14:23	2026-05-20 09:28:41.794	3	Botany road mascot 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
54	139	37	2	First disable toilet, door is not opening by key I think something wrong with the automatic lock\nsee vedio plz	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759320299549_VID-20251001-WA0172.mp4"]	140	140	2025-10-01 22:06:38	2025-10-01 22:06:38	2	Tonbridge Reserve 	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
97	139	45	2	aaaaaaa	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-20/1779246849185-WhatsApp_Image_2025-05-26_at_11.29.50_6a255cf0.jpg"]	140	140	2026-05-20 13:14:11.374	2026-05-27 13:43:45.613	3	sss	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-20 13:16:45.348	2026-05-22 09:30:58.759	2026-05-20 13:16:45.348	2026-05-22 09:30:58.759	4	\N
30	139	37	2	1-one of the Unisex toilet is blocked \n2-despenser in the disable toilet is broken 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758803445627_IMG-20250925-WA0062.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1758803445633_IMG-20250925-WA0068.jpg"]	140	140	2025-09-25 22:30:52	2025-09-25 22:30:52	2	L Estrange park	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
69	139	37	2	Unisex toilet door number 6 lock despenser is broken \nI Reported before 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1759920328515_IMG-20251008-WA0148.jpg"]	140	140	2025-10-08 21:45:36	2025-10-08 21:45:36	2	Gardiner Park	Public Amenities Cleaning	Bayside Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
85	139	45	2	 Scarborough Park Production avenue \n*2 despensers need to be changed broken locks \n*Shower room disable toilet door is not opening cleaner can't clean it \nHas been reported several times 	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760443986525_IMG-20251014-WA0147.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760443986503_IMG-20251014-WA0146.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760443986531_IMG-20251014-WA0148.jpg"]	140	140	2025-10-14 23:13:11	2025-10-14 23:13:11	2	Scarborough Park Production avenue 	Public Amenities Cleaning	Mascot Public Amenities	Jessica Bosevska	1	Bayside Council	140	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	2026-05-19 13:45:45.140114	2026-05-19 13:52:35.538828	4	\N
\.


--
-- TOC entry 5465 (class 0 OID 42013)
-- Dependencies: 275
-- Data for Name: report_template_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_template_categories (id, name, created_at) FROM stdin;
1	CLEANING	2026-05-22 11:28:20.845701
2	MAINTENANCE	2026-05-22 11:28:20.847248
3	SECURITY	2026-05-22 11:28:20.847638
4	LANDSCAPING	2026-05-22 11:28:20.847998
5	WASTE_MANAGEMENT	2026-05-22 11:28:20.848416
6	PUBLIC_AMENITIES	2026-05-22 11:28:20.84874
7	INSPECTIONS	2026-05-22 11:28:20.849002
8	INCIDENT	2026-05-22 11:28:20.84924
9	GENERAL	2026-05-22 11:28:20.849464
10	Roof and Gutter	2026-05-22 11:32:25.762217
11	Ground Maintenance	2026-05-22 14:39:20.015697
\.


--
-- TOC entry 5423 (class 0 OID 17099)
-- Dependencies: 233
-- Data for Name: report_template_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_template_items (id, name, type, created_at, report_template_id, value, "order", config, required) FROM stdin;
1136	Before photos	IMAGES	2026-01-17 00:34:27.425	59		1	\N	f
1137	After photos	IMAGES	2026-01-17 00:34:27.425	59		2	\N	f
1138	Overhanging tree brances?	YES_NO	2026-01-17 00:34:27.425	59		3	\N	f
1139	Ensure downpipes are clear?	YES_NO	2026-01-17 00:34:27.425	59		4	\N	f
1140	Clear gutters of debris?	YES_NO	2026-01-17 00:34:27.425	59		5	\N	f
1141	Date:	TEXT	2026-01-17 00:34:27.425	59		6	\N	f
1142	Site Name	[SITE_NAME]	2026-01-17 00:34:27.425	59		7	\N	f
1143	Blow roof and leaves	YES_NO	2026-01-17 00:34:27.425	59		8	\N	f
1144	Any Maintenance issues?	YES_NO	2026-01-17 00:34:27.425	59		9	\N	f
1145	IS Condition of the roof and gutters good?	YES_NO	2026-01-17 00:34:27.425	59		10	\N	f
1146	Have you introduced yourself to the staff onsite and advised you are commencing work?	YES_NO	2026-01-17 00:34:27.425	59		11	\N	f
1147	Are all staff attending site wearing appropriate PPE & Uniform ?	YES_NO	2026-01-17 00:34:27.425	59		12	\N	f
1148	Is the premises safe to enter?	YES_NO	2026-01-17 00:34:27.425	59		13	\N	f
1149	Site Address:	[SITE_ADDRESS]	2026-01-17 00:34:27.425	59		14	\N	f
1050	Test Item	TEXT	2026-01-16 22:53:08.436	54		1	\N	f
1051	Test Item	TEXT	2026-01-16 22:53:27.075	55		1	\N	f
630	Section Six-  Appendix 	IMAGES	2025-10-08 11:12:33	33	\N	6	\N	f
755	Test Item	TEXT	2026-01-16 14:01:00.968	42		1	\N	f
1528	Site Name	[SITE_NAME]	2026-05-29 09:33:17.116	38		1	{"label": "Site Name"}	f
1529	Site Address:	[SITE_ADDRESS]	2026-05-29 09:33:17.116	38		2	{"label": "Site Address:"}	f
1530	Date:	[REPORT_DATE]	2026-05-29 09:33:17.116	38		3	{"label": "Date:", "visibleToStaff": false}	f
1531	Overhanging tree brances?	YES_NO	2026-05-29 09:33:17.116	38	NO	4	{"label": "Overhanging tree brances?", "defaultValue": "NO"}	f
1532	Ensure downpipes are clear?	YES_NO	2026-05-29 09:33:17.116	38		5	{"label": "Ensure downpipes are clear?"}	f
1533	Clear gutters of debris?	YES_NO	2026-05-29 09:33:17.117	38	YES	6	{"label": "Clear gutters of debris?", "defaultValue": "YES"}	f
1534	Blow roof and leaves	YES_NO	2026-05-29 09:33:17.117	38	YES	7	{"label": "Blow roof and leaves", "defaultValue": "YES"}	f
1535	Any Maintenance issues?	YES_NO	2026-05-29 09:33:17.117	38		8	{"label": "Any Maintenance issues?"}	f
1536	IS Condition of the roof and gutters good?	YES_NO	2026-05-29 09:33:17.117	38	YES	9	{"label": "IS Condition of the roof and gutters good?", "defaultValue": "YES"}	f
1537	Have you introduced yourself to the staff onsite and advised you are commencing work?	YES_NO	2026-05-29 09:33:17.117	38	YES	10	{"label": "Have you introduced yourself to the staff onsite and advised you are commencing work?", "defaultValue": "YES"}	f
1538	Are all staff attending site wearing appropriate PPE & Uniform ?	YES_NO	2026-05-29 09:33:17.117	38	YES	11	{"label": "Are all staff attending site wearing appropriate PPE & Uniform ?", "defaultValue": "YES"}	f
1539	Is the premises safe to enter?	YES_NO	2026-05-29 09:33:17.117	38	YES	12	{"label": "Is the premises safe to enter?", "defaultValue": "YES"}	f
1540	Before photos	IMAGES	2026-05-29 09:33:17.117	38		13	{"label": "Before photos"}	f
1541	After photos	IMAGES	2026-05-29 09:33:17.117	38		14	{"label": "After photos"}	f
756	Test Item	TEXT	2026-01-16 14:04:55.47	43		1	\N	f
625	Section One - Excutive Summary	TEXT	2025-10-08 11:12:33	33	\N	1	\N	f
626	Section Two - Contract Review 	TEXT	2025-10-08 11:12:33	33	\N	2	\N	f
627	Section Three - Inspections 	TEXT	2025-10-08 11:12:33	33	\N	3	\N	f
628	Section Four - Staffing 	TEXT	2025-10-08 11:12:33	33	\N	4	\N	f
629	Sective Five - Financials 	TEXT	2025-10-08 11:12:33	33	\N	5	\N	f
1038	333333333333333	NUMBER	\N	44	6	1	\N	f
1039	2222	NUMBER	\N	44	6	2	\N	t
1040	11111	TEXTAREA	\N	44	30	3	\N	t
1041	333333333333333	NUMBER	2026-01-16 22:52:10.684	51	6	1	\N	f
1042	2222	NUMBER	2026-01-16 22:52:10.684	51	6	2	\N	t
1043	11111	TEXTAREA	2026-01-16 22:52:10.684	51	30	3	\N	t
1044	333333333333333	NUMBER	2026-01-16 22:52:14.718	52	6	1	\N	f
1045	2222	NUMBER	2026-01-16 22:52:14.718	52	6	2	\N	t
1046	11111	TEXTAREA	2026-01-16 22:52:14.718	52	30	3	\N	t
1047	333333333333333	NUMBER	2026-01-16 22:52:17.141	53	6	1	\N	f
1048	2222	NUMBER	2026-01-16 22:52:17.141	53	6	2	\N	t
1049	11111	TEXTAREA	2026-01-16 22:52:17.141	53	30	3	\N	t
1080	Before photos	IMAGES	\N	56		1	\N	f
1081	After photos	IMAGES	\N	56		2	\N	f
1082	Overhanging tree brances?	YES_NO	\N	56		3	\N	f
1083	Ensure downpipes are clear?	YES_NO	\N	56		4	\N	f
1084	Clear gutters of debris?	YES_NO	\N	56		5	\N	f
1085	Date:	TEXT	\N	56		6	\N	f
1086	Site Name	[SITE_NAME]	\N	56		7	\N	f
1087	Blow roof and leaves	YES_NO	\N	56		8	\N	f
1088	Any Maintenance issues?	YES_NO	\N	56		9	\N	f
1089	IS Condition of the roof and gutters good?	YES_NO	\N	56		10	\N	f
1090	Have you introduced yourself to the staff onsite and advised you are commencing work?	YES_NO	\N	56		11	\N	f
1091	Are all staff attending site wearing appropriate PPE & Uniform ?	YES_NO	\N	56		12	\N	f
1092	Is the premises safe to enter?	YES_NO	\N	56		13	\N	f
1093	Site Address:	[SITE_ADDRESS]	\N	56		14	\N	f
1150	Site Name	[SITE_NAME]	2026-01-17 01:17:40.863	60		2	\N	f
1151	Site Address:	[SITE_ADDRESS]	2026-01-17 01:17:40.863	60		3	\N	f
1152	Is the Premises safe to enter?	YES_NO	2026-01-17 01:17:40.863	60		4	\N	f
1153	Are all staff attending site wearing appropriate PPE & Uniform?	YES_NO	2026-01-17 01:17:40.863	60		5	\N	f
1154	PHOTOS AFTER	IMAGES	2026-01-17 01:17:40.863	60		8	\N	f
1155	PHOTOS BEFORE	IMAGES	2026-01-17 01:17:40.863	60		7	\N	f
1108	Before photos	IMAGES	\N	57		1	\N	f
1109	After photos	IMAGES	\N	57		2	\N	f
1110	Overhanging tree brances?	YES_NO	\N	57		3	\N	f
1111	Ensure downpipes are clear?	YES_NO	\N	57		4	\N	f
1112	Clear gutters of debris?	YES_NO	\N	57		5	\N	f
1113	Date:	TEXT	\N	57		6	\N	f
1114	Site Name	[SITE_NAME]	\N	57		7	\N	f
1115	Blow roof and leaves	YES_NO	\N	57		8	\N	f
1116	Any Maintenance issues?	YES_NO	\N	57		9	\N	f
1117	IS Condition of the roof and gutters good?	YES_NO	\N	57		10	\N	f
1118	Have you introduced yourself to the staff onsite and advised you are commencing work?	YES_NO	\N	57		11	\N	f
1119	Are all staff attending site wearing appropriate PPE & Uniform ?	YES_NO	\N	57		12	\N	f
1120	Is the premises safe to enter?	YES_NO	\N	57		13	\N	f
1121	Site Address:	[SITE_ADDRESS]	\N	57		14	\N	f
1122	Before photos	IMAGES	2026-01-17 00:16:31.593	58		1	\N	f
1123	After photos	IMAGES	2026-01-17 00:16:31.593	58		2	\N	f
1124	Overhanging tree brances?	YES_NO	2026-01-17 00:16:31.593	58		3	\N	f
1125	Ensure downpipes are clear?	YES_NO	2026-01-17 00:16:31.593	58		4	\N	f
1126	Clear gutters of debris?	YES_NO	2026-01-17 00:16:31.593	58		5	\N	f
1127	Date:	TEXT	2026-01-17 00:16:31.593	58		6	\N	f
1128	Site Name	[SITE_NAME]	2026-01-17 00:16:31.593	58		7	\N	f
1129	Blow roof and leaves	YES_NO	2026-01-17 00:16:31.593	58		8	\N	f
1130	Any Maintenance issues?	YES_NO	2026-01-17 00:16:31.593	58		9	\N	f
1131	IS Condition of the roof and gutters good?	YES_NO	2026-01-17 00:16:31.593	58		10	\N	f
1132	Have you introduced yourself to the staff onsite and advised you are commencing work?	YES_NO	2026-01-17 00:16:31.593	58		11	\N	f
1133	Are all staff attending site wearing appropriate PPE & Uniform ?	YES_NO	2026-01-17 00:16:31.593	58		12	\N	f
1134	Is the premises safe to enter?	YES_NO	2026-01-17 00:16:31.593	58		13	\N	f
1135	Site Address:	[SITE_ADDRESS]	2026-01-17 00:16:31.593	58		14	\N	f
1156	Date:	TEXT	2026-01-17 01:17:40.863	60		1	\N	f
1157	Have you introduced yourself to the staff onsite and advised you are commencing work?	YES_NO	2026-01-17 01:17:40.863	60		6	\N	f
1166	Are all staff attending site wearing appropriate PPE & Uniform?	YES_NO	\N	61		1	\N	f
1167	Date:	TEXT	\N	61		2	\N	f
1168	PHOTOS AFTER	IMAGES	\N	61		3	\N	f
1169	PHOTOS BEFORE	IMAGES	\N	61		4	\N	f
1170	Have you introduced yourself to the staff onsite and advised you are commencing work?	YES_NO	\N	61		5	\N	f
1171	Site Name	[SITE_NAME]	\N	61		6	\N	f
1172	Site Address:	[SITE_ADDRESS]	\N	61		7	\N	f
1173	Is the Premises safe to enter?	YES_NO	\N	61		8	\N	f
1174	Are all staff attending site wearing appropriate PPE & Uniform?	YES_NO	2026-02-18 13:16:55.11	62		1	\N	f
1175	Date:	TEXT	2026-02-18 13:16:55.11	62		2	\N	f
1176	PHOTOS AFTER	IMAGES	2026-02-18 13:16:55.11	62		3	\N	f
1177	PHOTOS BEFORE	IMAGES	2026-02-18 13:16:55.11	62		4	\N	f
1178	Have you introduced yourself to the staff onsite and advised you are commencing work?	YES_NO	2026-02-18 13:16:55.11	62		5	\N	f
1179	Site Name	[SITE_NAME]	2026-02-18 13:16:55.11	62		6	\N	f
1180	Site Address:	[SITE_ADDRESS]	2026-02-18 13:16:55.11	62		7	\N	f
1181	Is the Premises safe to enter?	YES_NO	2026-02-18 13:16:55.11	62		8	\N	f
1182	Are all staff attending site wearing appropriate PPE & Uniform?	YES_NO	2026-02-18 13:16:59.465	63		1	\N	f
1183	Date:	TEXT	2026-02-18 13:16:59.465	63		2	\N	f
1184	PHOTOS AFTER	IMAGES	2026-02-18 13:16:59.465	63		3	\N	f
1185	PHOTOS BEFORE	IMAGES	2026-02-18 13:16:59.465	63		4	\N	f
1186	Have you introduced yourself to the staff onsite and advised you are commencing work?	YES_NO	2026-02-18 13:16:59.465	63		5	\N	f
1187	Site Name	[SITE_NAME]	2026-02-18 13:16:59.465	63		6	\N	f
1188	Site Address:	[SITE_ADDRESS]	2026-02-18 13:16:59.465	63		7	\N	f
1189	Is the Premises safe to enter?	YES_NO	2026-02-18 13:16:59.465	63		8	\N	f
1542	Date	[REPORT_DATE]	2026-05-29 10:26:56.595	72		1	{"label": "Tiime and Date", "visibleToStaff": false}	f
1543	Is the Premises safe to enter?	YES_NO	2026-05-29 10:26:56.595	72	YES	2	{"label": "Is the Premises safe to enter?", "defaultValue": "YES"}	f
1544	After Photos – Cleaning Service Compliance	IMAGES	2026-05-29 10:26:56.595	72		3	{"label": "After Photos – Cleaning Service Compliance"}	f
1545	Date	[REPORT_DATE]	2026-05-29 10:27:05.685	70		1	{"label": "Tiime and Date", "visibleToStaff": false}	f
1546	Is the Premises safe to enter?	YES_NO	2026-05-29 10:27:05.685	70	YES	2	{"label": "Is the Premises safe to enter?", "defaultValue": "YES"}	f
1547	After Photos – Cleaning Service Compliance	IMAGES	2026-05-29 10:27:05.685	70		3	{"label": "After Photos – Cleaning Service Compliance"}	f
1548	Site Name	[SITE_NAME]	2026-05-29 10:28:40.023	40		1	{"label": "Site Name"}	f
1549	Site Address:	[SITE_ADDRESS]	2026-05-29 10:28:40.023	40		2	{"label": "Site Address:"}	f
1550	Date:	DATE	2026-05-29 10:28:40.023	40		3	{"label": "Date:", "visibleToStaff": false}	f
1551	Is the Premises safe to enter?	YES_NO	2026-05-29 10:28:40.023	40	YES	4	{"label": "Is the Premises safe to enter?", "defaultValue": "YES"}	f
1552	Are all staff attending site wearing appropriate PPE & Uniform?	YES_NO	2026-05-29 10:28:40.023	40	YES	5	{"label": "Are all staff attending site wearing appropriate PPE & Uniform?", "defaultValue": "YES"}	f
1553	Have you introduced yourself to the staff onsite and advised you are commencing work?	YES_NO	2026-05-29 10:28:40.023	40	YES	6	{"label": "Have you introduced yourself to the staff onsite and advised you are commencing work?", "defaultValue": "YES"}	f
1554	PHOTOS BEFORE	IMAGES	2026-05-29 10:28:40.023	40		7	{"label": "PHOTOS BEFORE"}	f
1555	PHOTOS AFTER	IMAGES	2026-05-29 10:28:40.023	40		8	{"label": "PHOTOS AFTER"}	f
\.


--
-- TOC entry 5484 (class 0 OID 46726)
-- Dependencies: 294
-- Data for Name: report_template_services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_template_services (report_template_id, service_id, created_at) FROM stdin;
38	5	2026-05-29 09:33:17.098+10
72	4	2026-05-29 10:26:56.579+10
70	4	2026-05-29 10:27:05.674+10
40	6	2026-05-29 10:28:40.008+10
\.


--
-- TOC entry 5425 (class 0 OID 17109)
-- Dependencies: 235
-- Data for Name: report_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_templates (id, name, created_by, updated_by, created_at, updated_at, description, file_url, status, "order", category, settings, assigned_staff_id) FROM stdin;
33	Monthly Report September 2025	1	1	2025-10-08 11:12:33	2025-10-08 11:12:33	Hunters Hill Monthly Report 	placeholder.pdf	1	\N	GENERAL	\N	\N
38	Roof and Gutter Cleaning Report	1	142	2025-12-11 12:56:27	2026-05-29 09:33:17.126	Roof and Gutter Cleaning Report		1	0	Roof and Gutter	\N	141
72	Bayside Public Amenities Cleaning Inspection Report	142	142	2026-05-27 10:10:38.368	2026-05-29 10:26:56.604	Bayside Cleaning Inspection Report 		1	0	PUBLIC_AMENITIES	\N	140
70	Mascot Public Amenities Cleaning Inspection Report	142	142	2026-05-21 11:37:46.97	2026-05-29 10:27:05.686	Mascot Public Amenities Cleaning Inspection Report		1	0	PUBLIC_AMENITIES	\N	140
40	Ground Maintenance Report	1	142	2025-12-11 13:23:44	2026-05-29 10:28:40.025	Ground Maintenance Report		1	0	Ground Maintenance	\N	141
\.


--
-- TOC entry 5426 (class 0 OID 17118)
-- Dependencies: 236
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, created_at, updated_at, created_by, updated_by, description, "order") FROM stdin;
ACOUNTANT	Accountant	2024-07-23 05:22:57	2024-07-23 05:22:57	1	1	\N	\N
ADMIN	Admin	2024-07-23 05:22:12	2024-07-23 05:22:12	1	1	\N	\N
\.


--
-- TOC entry 5457 (class 0 OID 41291)
-- Dependencies: 267
-- Data for Name: schema_patches_applied; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schema_patches_applied (name, applied_at) FROM stdin;
dashboard_unread_baseline_v1	2026-05-19 13:45:45.145603
dashboard_customer_unread_baseline_v1	2026-05-19 13:52:35.545644
report_fault_customer_reply_to_admin_v1	2026-05-19 14:11:13.808839
dashboard_badge_dismissed_columns_v1	2026-05-22 09:32:45.579785
sites_dedupe_unique_id_v1	2026-05-22 13:13:49.990015
db_dedupe_duplicate_ids_v1	2026-05-22 13:32:50.831124
db_unique_keys_v1	2026-05-22 13:36:35.903214
departments_numeric_id_v1	2026-05-25 13:11:17.4586
customer_opened_visibility_backfill_v1	2026-05-25 16:46:31.030093
rename_departments_to_services_v1	2026-05-28 09:56:48.224991
services_numeric_id_v1	2026-05-28 09:56:48.285592
\.


--
-- TOC entry 5413 (class 0 OID 17043)
-- Dependencies: 223
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.services (name, created_by, updated_by, created_at, updated_at, description, id) FROM stdin;
Public Amenities Cleaning	1	1	2025-08-11 12:20:41	2025-08-11 12:20:41	Public Amenities Cleaning for Councils	4
Roof and Gutter Cleaning	1	1	2025-08-11 12:23:27	2025-08-11 12:23:27	Roof and Gutter Cleaning	5
Ground Maintenance	142	142	2026-05-25 13:15:20.39	2026-05-25 13:15:20.39	Ground Maintenance	6
\.


--
-- TOC entry 5427 (class 0 OID 17124)
-- Dependencies: 237
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (setting_key, setting_value, created_at, updated_at, created_by, updated_by, setting_type, "order", setting_lable) FROM stdin;
COMPANY_ADDRESS	Suite 309	2024-06-23 17:47:39	2024-10-25 17:46:39	1	1	TEXT	0	Company address
COMPANY_EMAIL	helpdesk@servicelink.net.au	2024-06-23 17:47:39	2024-10-25 17:46:39	1	1	TEXT	0	Company email
COMPANY_HOTLINE	49 Queens rd	\N	2024-10-25 17:46:39	1	1	TEXT	0	Company hotline
COMPANY_NAME	Servicelink Pty Ltd	2024-06-23 17:47:39	2024-10-25 17:46:39	1	1	TEXT	0	Company name
COMPANY_PHONE	0420220220	2024-06-23 17:47:39	2024-10-25 17:46:39	1	1	TEXT	0	Company phone
COMPANY_WEBSITE	www.servicelink.net.au	2024-06-23 17:47:39	2024-10-25 17:46:39	1	1	TEXT	0	Company website
NAME	Service Link	2024-06-23 17:47:39	2024-10-25 17:46:39	1	1	TEXT	1	Name
REMINDER_TASK	10	2024-06-23 17:47:39	2024-10-25 17:46:39	1	1	TEXT	2	Send reminder email (minutes)
\.


--
-- TOC entry 5428 (class 0 OID 17132)
-- Dependencies: 238
-- Data for Name: site_item_staff_shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.site_item_staff_shifts (id, site_item_staff_id, start_time, end_time, type, type_value) FROM stdin;
585	552	02:02:00	02:02:00	C	0,1,2,3,4,5
586	553	01:01:00	04:04:00	C	
587	554	02:02:00	02:02:00	C	
306	273	06:04:00	22:00:00	C	
331	298	01:01:00	04:01:00	C	
333	300	07:07:00	15:07:00	C	
341	308	02:03:00	04:05:00	C	
344	311	06:06:00	07:07:00	C	
347	314	02:03:00	04:05:00	C	
348	315	01:02:00	03:05:00	C	
349	316	02:03:00	02:04:00	C	
351	318	03:03:00	03:04:00	C	
352	319	03:03:00	03:04:00	C	
353	320	01:03:00	02:04:00	C	
356	323	03:04:00	02:03:00	C	
357	324	02:03:00	05:03:00	C	
360	327	02:03:00	00:05:00	C	
361	328	02:04:00	08:05:00	C	
362	329	01:01:00	07:07:00	C	
363	330	00:00:00	07:07:00	C	
364	331	02:00:00	13:21:00	C	
367	334	00:23:00	13:23:00	C	
369	336	00:00:00	10:05:00	C	
370	337	00:00:00	08:00:00	C	
371	338	00:00:00	07:07:00	C	
372	339	00:00:00	07:00:00	C	
374	341	06:00:00	14:00:00	C	
377	344	00:00:00	07:07:00	C	
379	346	00:00:00	07:07:00	C	
384	351	00:00:00	07:07:00	C	
387	354	00:00:00	07:07:00	C	
388	355	00:00:00	07:07:00	C	
390	357	00:00:00	07:07:00	C	
391	358	00:00:00	07:07:00	C	
393	360	00:00:00	07:07:00	C	
394	361	00:00:00	07:07:00	C	
396	363	00:00:00	07:07:00	C	
400	367	00:00:00	07:07:00	C	
401	368	00:00:00	07:07:00	C	
402	369	00:00:00	07:07:00	C	
409	376	00:00:00	07:07:00	C	
410	377	00:00:00	07:07:00	C	
411	378	00:00:00	07:07:00	C	
414	381	00:00:00	07:07:00	C	
415	382	00:00:00	07:07:00	C	
416	383	00:00:00	07:07:00	C	
417	384	00:00:00	07:07:00	C	
418	385	00:00:00	07:07:00	C	
419	386	00:00:00	07:07:00	C	
420	387	00:00:00	07:07:00	C	
421	388	00:00:00	07:07:00	C	
422	389	00:00:00	07:07:00	C	
423	390	00:00:00	07:07:00	C	
424	391	00:00:00	07:07:00	C	
425	392	00:00:00	07:07:00	C	
426	393	00:00:00	07:03:00	C	
427	394	00:00:00	07:07:00	C	
428	395	00:00:00	07:07:00	C	
429	396	00:00:00	07:07:00	C	
430	397	00:00:00	07:07:00	C	
431	398	00:00:00	07:07:00	C	
433	400	00:00:00	07:07:00	C	
434	401	00:00:00	07:07:00	C	
435	402	00:00:00	07:07:00	C	
436	403	00:00:00	07:07:00	C	
438	405	00:00:00	07:07:00	C	
439	406	00:00:00	07:07:00	C	
441	408	00:00:00	07:07:00	C	
442	409	02:02:00	07:07:00	C	
443	410	00:00:00	07:07:00	C	
444	411	00:00:00	07:07:00	C	
447	414	00:00:00	07:07:00	C	
448	415	00:00:00	07:07:00	C	
449	416	00:00:00	07:07:00	C	
450	417	00:00:00	07:07:00	C	
451	418	00:00:00	07:07:00	C	
453	420	00:00:00	07:07:00	C	
454	421	00:00:00	07:07:00	C	
455	422	00:00:00	07:07:00	C	
456	423	00:00:00	07:07:00	C	
457	424	00:00:00	07:07:00	C	
458	425	00:00:00	07:07:00	C	
459	426	00:00:00	07:07:00	C	
460	427	00:00:00	07:07:00	C	
461	428	00:00:00	07:07:00	C	
462	429	00:00:00	07:07:00	C	
463	430	00:00:00	07:07:00	C	
464	431	00:07:00	07:07:00	C	
465	432	00:00:00	07:07:00	C	
466	433	00:00:00	07:07:00	C	
467	434	00:00:00	07:07:00	C	
468	435	00:00:00	00:07:00	C	
469	436	00:00:00	00:07:00	C	
470	437	00:00:00	07:07:00	C	
471	438	00:00:00	07:07:00	C	
472	439	00:00:00	07:07:00	C	
473	440	00:00:00	07:07:00	C	
474	441	00:00:00	07:07:00	C	
475	442	00:00:00	07:07:00	C	
476	443	00:00:00	00:07:00	C	
477	444	00:00:00	07:07:00	C	
478	445	00:00:00	07:07:00	C	
479	446	00:00:00	07:07:00	C	
480	447	00:00:00	07:07:00	C	
481	448	00:00:00	07:07:00	C	
482	449	00:00:00	07:07:00	C	
483	450	00:00:00	07:07:00	C	
484	451	00:00:00	07:07:00	C	
485	452	00:00:00	07:07:00	C	
486	453	00:00:00	07:07:00	C	
487	454	00:00:00	07:07:00	C	
488	455	00:00:00	07:07:00	C	
489	456	00:00:00	07:07:00	C	
490	457	00:00:00	07:00:00	C	
491	458	00:00:00	07:07:00	C	
492	459	00:00:00	07:07:00	C	
493	460	00:00:00	07:07:00	C	
494	461	00:00:00	06:07:00	C	
495	462	00:00:00	07:07:00	C	
496	463	00:00:00	07:07:00	C	
497	464	00:00:00	07:07:00	C	
498	465	01:00:00	07:07:00	C	
499	466	00:07:00	08:00:00	C	
500	467	00:00:00	07:07:00	C	
502	469	00:00:00	07:07:00	C	
503	470	00:00:00	07:07:00	C	
505	472	00:00:00	07:07:00	C	
506	473	00:00:00	07:07:00	C	
508	475	00:00:00	07:07:00	C	
510	477	00:00:00	07:07:00	C	
511	478	00:00:00	07:07:00	C	
512	479	00:00:00	07:07:00	C	
514	481	00:00:00	07:07:00	C	
515	482	00:00:00	07:07:00	C	
516	483	00:00:00	07:07:00	C	
517	484	00:00:00	07:07:00	C	
518	485	00:00:00	00:07:00	C	
519	486	07:07:00	07:07:00	C	
520	487	00:00:00	07:07:00	C	
521	488	11:03:00	07:07:00	C	
522	489	09:04:00	03:03:00	C	
523	490	05:12:00	20:00:00	C	
524	491	05:00:00	11:02:00	C	
525	492	02:05:00	05:04:00	C	
526	493	02:04:00	02:06:00	C	
527	494	00:00:00	07:09:00	C	
528	495	01:02:00	04:04:00	C	
529	496	00:00:00	02:07:00	C	
530	497	02:03:00	03:05:00	C	
531	498	00:00:00	07:07:00	C	
532	499	00:00:00	07:07:00	C	
533	500	00:00:00	07:07:00	C	
534	501	00:00:00	01:01:00	C	
535	502	00:00:00	07:07:00	C	
536	503	00:00:00	03:03:00	C	
537	504	00:00:00	07:07:00	C	
538	505	00:00:00	03:03:00	C	
539	506	00:00:00	07:07:00	C	
540	507	00:00:00	01:01:00	C	
541	508	00:00:00	07:07:00	C	
542	509	00:00:00	04:04:00	C	
543	510	00:00:00	07:07:00	C	
544	511	00:00:00	04:04:00	C	
545	512	00:00:00	05:05:00	C	
546	513	00:00:00	07:07:00	C	
547	514	01:01:00	04:04:00	C	
548	515	01:01:00	07:07:00	C	
549	516	00:00:00	03:03:00	C	
550	517	06:06:00	07:07:00	C	
551	518	06:06:00	06:06:00	C	
552	519	00:00:00	07:07:00	C	
553	520	00:00:00	07:07:00	C	
554	521	00:00:00	07:07:00	C	
555	522	00:00:00	12:38:00	C	
556	523	00:00:00	07:07:00	C	
557	524	00:00:00	07:07:00	C	
558	525	00:00:00	07:07:00	C	
559	526	00:00:00	03:03:00	C	
560	527	00:00:00	07:07:00	C	
561	528	00:00:00	07:07:00	C	
562	529	00:00:00	07:07:00	C	
563	530	00:00:00	12:42:00	C	
564	531	06:06:00	04:04:00	C	
565	532	06:06:00	06:06:00	C	
566	533	00:00:00	07:07:00	C	
567	534	00:02:00	12:44:00	C	
568	535	00:00:00	07:07:00	C	
569	536	00:04:00	12:45:00	C	
570	537	00:00:00	07:06:00	C	
571	538	00:03:00	12:46:00	C	
572	539	00:00:00	07:07:00	C	
573	540	00:00:00	06:06:00	C	
574	541	00:00:00	07:07:00	C	
575	542	01:01:00	04:04:00	C	
576	543	00:00:00	12:51:00	C	
577	544	00:00:00	07:07:00	C	
578	545	00:04:00	00:07:00	C	
579	546	00:00:00	07:07:00	C	
580	547	00:00:00	04:04:00	C	
581	548	00:00:00	07:07:00	C	
582	549	00:01:00	00:03:00	C	
583	550	00:00:00	07:07:00	C	
584	551	00:03:00	00:07:00	C	
588	555	00:00:00	07:07:00	C	
\.


--
-- TOC entry 5429 (class 0 OID 17137)
-- Dependencies: 239
-- Data for Name: site_item_staffs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.site_item_staffs (id, site_item_id, staff_id, created_at) FROM stdin;
553	297	141	2026-05-25 12:17:18.937
354	142	141	2025-12-08 11:04:37
355	143	141	2025-12-08 11:06:46
300	107	140	2025-12-04 10:45:03
357	145	141	2025-12-08 11:13:24
358	146	141	2025-12-08 11:16:02
360	148	141	2025-12-08 11:19:11
361	149	141	2025-12-08 11:21:24
363	151	141	2025-12-08 11:25:41
367	155	141	2025-12-08 12:15:58
368	156	141	2025-12-08 12:21:20
369	157	141	2025-12-08 12:24:59
376	159	141	2025-12-08 12:41:11
377	160	141	2025-12-08 12:43:58
378	161	141	2025-12-08 12:48:07
381	162	141	2025-12-08 12:54:59
382	163	141	2025-12-08 12:56:38
383	164	141	2025-12-08 12:59:15
384	165	141	2025-12-08 13:01:16
385	166	141	2025-12-08 13:39:03
386	167	141	2025-12-08 13:42:56
387	168	141	2025-12-08 13:46:03
388	169	141	2025-12-08 13:49:09
389	170	141	2025-12-08 13:50:52
341	94	140	2025-12-04 13:52:14
390	171	141	2025-12-08 13:53:55
391	172	141	2025-12-08 13:55:22
392	173	141	2025-12-08 13:57:14
393	174	141	2025-12-09 10:40:44
394	175	141	2025-12-09 10:44:51
395	176	141	2025-12-09 10:46:47
396	177	141	2025-12-09 10:48:59
397	178	141	2025-12-09 10:53:27
398	179	141	2025-12-09 10:57:48
400	181	141	2025-12-09 11:03:12
401	182	141	2025-12-09 11:05:05
402	183	141	2025-12-09 11:07:38
403	184	141	2025-12-09 11:13:04
405	186	141	2025-12-09 11:18:06
406	187	141	2025-12-09 11:20:53
408	189	141	2025-12-09 11:24:17
409	190	141	2025-12-09 11:25:44
410	191	141	2025-12-09 11:27:25
411	192	141	2025-12-09 11:28:49
414	195	141	2025-12-09 11:36:22
415	196	141	2025-12-09 11:39:17
416	197	141	2025-12-09 11:40:49
417	198	141	2025-12-09 11:43:35
418	199	141	2025-12-09 11:45:17
420	201	141	2025-12-09 11:52:13
421	202	141	2025-12-09 11:53:42
422	203	141	2025-12-09 12:36:16
423	204	141	2025-12-09 12:41:03
424	205	141	2025-12-09 12:44:42
425	206	141	2025-12-09 12:46:47
426	207	141	2025-12-10 09:38:17
427	208	141	2025-12-10 09:40:31
428	209	141	2025-12-10 09:43:29
429	210	141	2025-12-10 09:46:30
430	211	141	2025-12-10 09:48:57
431	212	141	2025-12-10 09:53:11
432	213	141	2025-12-10 10:01:18
433	214	141	2025-12-10 10:08:42
434	215	141	2025-12-10 10:11:38
435	216	141	2025-12-10 10:13:33
436	217	141	2025-12-10 10:14:54
437	218	141	2025-12-10 10:16:24
438	219	141	2025-12-10 10:17:52
439	220	141	2025-12-10 10:19:54
273	95	141	2025-08-12 12:06:17
298	111	141	2025-12-03 12:41:43
308	113	141	2025-12-04 11:02:06
311	102	141	2025-12-04 11:07:18
314	114	141	2025-12-04 12:12:15
315	115	141	2025-12-04 12:14:54
316	116	141	2025-12-04 12:15:33
318	118	141	2025-12-04 12:25:56
319	119	141	2025-12-04 12:29:39
320	120	141	2025-12-04 12:38:24
323	121	141	2025-12-04 12:43:24
324	122	141	2025-12-04 12:45:31
327	123	141	2025-12-04 12:51:01
328	124	141	2025-12-04 12:55:01
329	125	141	2025-12-04 13:15:04
330	126	141	2025-12-04 13:18:43
331	127	141	2025-12-04 13:21:47
334	128	141	2025-12-04 13:24:09
336	130	141	2025-12-04 13:28:54
337	131	141	2025-12-04 13:32:23
338	132	141	2025-12-04 13:34:45
339	133	141	2025-12-04 13:49:29
344	134	141	2025-12-08 10:18:52
346	136	141	2025-12-08 10:40:08
351	139	141	2025-12-08 10:54:13
440	221	141	2025-12-10 10:24:12
441	222	141	2025-12-10 10:26:51
442	223	141	2025-12-10 10:29:36
443	224	141	2025-12-10 10:34:12
444	225	141	2025-12-10 10:41:48
445	226	141	2025-12-10 10:43:39
446	227	141	2025-12-10 10:45:57
447	228	141	2025-12-10 10:47:23
448	229	141	2025-12-10 10:49:33
513	249	141	2025-12-11 12:34:39
514	279	141	2025-12-11 12:34:39
515	185	141	2025-12-11 12:35:32
516	280	141	2025-12-11 12:35:32
517	103	141	2025-12-11 12:36:07
518	104	141	2025-12-11 12:36:07
519	147	141	2025-12-11 12:37:07
520	281	141	2025-12-11 12:37:07
521	138	141	2025-12-11 12:38:22
522	282	141	2025-12-11 12:38:22
523	137	141	2025-12-11 12:39:02
524	283	141	2025-12-11 12:39:02
525	140	141	2025-12-11 12:40:25
526	284	141	2025-12-11 12:40:25
527	141	141	2025-12-11 12:41:28
528	285	141	2025-12-11 12:41:28
529	188	141	2025-12-11 12:42:52
530	286	141	2025-12-11 12:42:52
531	100	141	2025-12-11 12:43:28
532	101	141	2025-12-11 12:43:28
533	252	141	2025-12-11 12:44:50
534	287	141	2025-12-11 12:44:50
535	255	141	2025-12-11 12:45:37
536	288	141	2025-12-11 12:45:37
537	180	141	2025-12-11 12:46:35
538	289	141	2025-12-11 12:46:35
539	261	141	2025-12-11 12:48:26
540	290	141	2025-12-11 12:48:26
541	193	141	2025-12-11 12:49:09
542	291	141	2025-12-11 12:49:09
543	292	141	2025-12-11 12:51:39
544	150	141	2025-12-11 12:52:25
545	293	141	2025-12-11 12:52:25
546	194	141	2025-12-11 12:53:35
547	294	141	2025-12-11 12:53:35
548	158	141	2025-12-11 12:54:28
549	295	141	2025-12-11 12:54:28
550	200	141	2025-12-11 12:55:04
551	296	141	2025-12-11 12:55:04
554	298	141	2026-05-25 12:53:06.38
555	263	141	2025-12-10 12:07:05
449	230	141	2025-12-10 10:51:51
450	231	141	2025-12-10 10:54:23
451	232	141	2025-12-10 10:56:37
452	233	141	2025-12-10 10:58:32
453	234	141	2025-12-10 11:00:36
454	235	141	2025-12-10 11:02:05
455	236	141	2025-12-10 11:06:31
456	237	141	2025-12-10 11:08:06
457	238	141	2025-12-10 11:09:39
458	239	141	2025-12-10 11:11:47
459	240	141	2025-12-10 11:13:13
460	241	141	2025-12-10 11:14:45
461	242	141	2025-12-10 11:16:45
462	243	141	2025-12-10 11:24:39
463	244	141	2025-12-10 11:30:33
464	245	141	2025-12-10 11:32:56
465	246	141	2025-12-10 11:34:17
466	247	141	2025-12-10 11:36:02
467	248	141	2025-12-10 11:38:23
469	250	141	2025-12-10 11:43:48
470	251	141	2025-12-10 11:45:10
472	253	141	2025-12-10 11:49:06
473	254	141	2025-12-10 11:50:25
475	256	141	2025-12-10 11:55:06
477	258	141	2025-12-10 11:58:30
478	259	141	2025-12-10 11:59:30
479	260	141	2025-12-10 12:00:27
481	262	141	2025-12-10 12:05:39
483	264	141	2025-12-10 12:08:45
484	265	141	2025-12-10 13:36:30
485	266	141	2025-12-10 13:38:25
486	267	141	2025-12-10 13:40:05
487	257	141	2025-12-11 11:06:46
488	105	141	2025-12-11 11:26:27
489	106	141	2025-12-11 11:26:27
490	96	141	2025-12-11 11:34:29
491	97	141	2025-12-11 11:34:29
492	98	141	2025-12-11 11:35:41
493	112	141	2025-12-11 11:37:13
494	268	141	2025-12-11 11:37:13
495	110	141	2025-12-11 11:39:35
496	269	141	2025-12-11 11:39:35
497	117	141	2025-12-11 12:20:30
498	270	141	2025-12-11 12:20:30
499	129	141	2025-12-11 12:21:49
500	271	141	2025-12-11 12:21:49
501	272	141	2025-12-11 12:25:39
502	152	141	2025-12-11 12:27:02
503	273	141	2025-12-11 12:27:02
504	153	141	2025-12-11 12:27:48
505	274	141	2025-12-11 12:27:48
506	135	141	2025-12-11 12:28:44
507	275	141	2025-12-11 12:28:44
508	144	141	2025-12-11 12:29:52
509	276	141	2025-12-11 12:29:52
510	154	141	2025-12-11 12:32:31
511	277	141	2025-12-11 12:32:31
512	278	141	2025-12-11 12:33:50
\.


--
-- TOC entry 5430 (class 0 OID 17143)
-- Dependencies: 240
-- Data for Name: site_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.site_items (id, created_at, customer_id, site_id, company_id, service_id) FROM stdin;
122	2025-12-04 12:45:31	136	59	2	5
297	2026-05-22 14:09:58.102	136	205	2	5
298	2026-05-25 12:53:06.371	136	206	2	5
272	2025-12-11 12:25:39	136	205	2	6
278	2025-12-11 12:33:50	136	206	2	6
123	2025-12-04 12:49:51	136	60	2	5
124	2025-12-04 12:55:01	136	61	2	5
169	2025-12-08 13:49:09	136	106	2	5
170	2025-12-08 13:50:52	136	107	2	5
171	2025-12-08 13:53:55	136	108	2	5
172	2025-12-08 13:55:22	136	109	2	5
173	2025-12-08 13:57:14	136	110	2	5
174	2025-12-09 10:40:44	136	111	2	5
175	2025-12-09 10:44:51	136	112	2	5
176	2025-12-09 10:46:47	136	113	2	5
177	2025-12-09 10:48:59	136	114	2	5
178	2025-12-09 10:53:27	136	115	2	5
179	2025-12-09 10:57:48	136	116	2	5
180	2025-12-09 11:00:36	136	117	2	5
181	2025-12-09 11:03:12	136	118	2	5
182	2025-12-09 11:05:05	136	119	2	5
183	2025-12-09 11:07:38	136	120	2	5
184	2025-12-09 11:13:04	136	121	2	5
185	2025-12-09 11:15:55	136	122	2	5
186	2025-12-09 11:18:06	136	123	2	5
187	2025-12-09 11:20:53	136	124	2	5
188	2025-12-09 11:22:32	136	125	2	5
189	2025-12-09 11:24:17	136	126	2	5
190	2025-12-09 11:25:44	136	127	2	5
191	2025-12-09 11:27:25	136	128	2	5
192	2025-12-09 11:28:49	136	129	2	5
193	2025-12-09 11:30:24	136	130	2	5
194	2025-12-09 11:31:43	136	131	2	5
195	2025-12-09 11:36:22	136	132	2	5
196	2025-12-09 11:39:17	136	133	2	5
197	2025-12-09 11:40:49	136	134	2	5
198	2025-12-09 11:43:35	136	135	2	5
199	2025-12-09 11:45:17	136	136	2	5
200	2025-12-09 11:47:43	136	137	2	5
201	2025-12-09 11:52:13	136	138	2	5
202	2025-12-09 11:53:42	136	139	2	5
203	2025-12-09 12:36:16	136	140	2	5
204	2025-12-09 12:41:03	136	141	2	5
205	2025-12-09 12:44:42	136	142	2	5
206	2025-12-09 12:46:47	136	143	2	5
207	2025-12-10 09:38:17	136	144	2	5
208	2025-12-10 09:40:31	136	145	2	5
209	2025-12-10 09:43:29	136	146	2	5
210	2025-12-10 09:46:30	136	147	2	5
211	2025-12-10 09:48:57	136	148	2	5
212	2025-12-10 09:53:11	136	149	2	5
213	2025-12-10 10:01:18	136	150	2	5
214	2025-12-10 10:08:42	136	151	2	5
125	2025-12-04 13:15:04	136	62	2	5
126	2025-12-04 13:18:43	136	63	2	5
127	2025-12-04 13:21:47	136	64	2	5
128	2025-12-04 13:23:33	136	65	2	5
129	2025-12-04 13:26:24	136	66	2	5
130	2025-12-04 13:28:54	136	67	2	5
131	2025-12-04 13:32:23	136	68	2	5
132	2025-12-04 13:34:45	136	69	2	5
133	2025-12-04 13:49:29	136	70	2	5
134	2025-12-08 10:18:52	136	71	2	5
135	2025-12-08 10:21:08	136	72	2	5
136	2025-12-08 10:40:08	136	73	2	5
137	2025-12-08 10:45:22	136	74	2	5
138	2025-12-08 10:50:51	136	75	2	5
139	2025-12-08 10:54:13	136	76	2	5
140	2025-12-08 10:56:47	136	77	2	5
141	2025-12-08 10:59:49	136	78	2	5
142	2025-12-08 11:04:37	136	79	2	5
143	2025-12-08 11:06:46	136	80	2	5
144	2025-12-08 11:11:32	136	81	2	5
145	2025-12-08 11:13:24	136	82	2	5
146	2025-12-08 11:15:17	136	83	2	5
147	2025-12-08 11:17:45	136	84	2	5
148	2025-12-08 11:19:11	136	85	2	5
149	2025-12-08 11:21:24	136	86	2	5
150	2025-12-08 11:23:31	136	87	2	5
151	2025-12-08 11:25:41	136	88	2	5
152	2025-12-08 11:27:33	136	89	2	5
153	2025-12-08 12:11:52	136	90	2	5
154	2025-12-08 12:13:42	136	91	2	5
155	2025-12-08 12:15:58	136	92	2	5
156	2025-12-08 12:21:20	136	93	2	5
157	2025-12-08 12:24:59	136	94	2	5
158	2025-12-08 12:26:46	136	95	2	5
159	2025-12-08 12:33:24	136	96	2	5
160	2025-12-08 12:43:58	136	97	2	5
161	2025-12-08 12:48:07	136	98	2	5
162	2025-12-08 12:54:59	136	99	2	5
163	2025-12-08 12:56:38	136	100	2	5
164	2025-12-08 12:59:15	136	101	2	5
165	2025-12-08 13:01:16	136	102	2	5
166	2025-12-08 13:39:03	136	103	2	5
167	2025-12-08 13:42:56	136	104	2	5
168	2025-12-08 13:46:03	136	105	2	5
215	2025-12-10 10:11:38	136	152	2	5
216	2025-12-10 10:13:33	136	153	2	5
217	2025-12-10 10:14:54	136	154	2	5
218	2025-12-10 10:16:24	136	155	2	5
219	2025-12-10 10:17:52	136	156	2	5
220	2025-12-10 10:19:54	136	157	2	5
221	2025-12-10 10:24:12	136	158	2	5
222	2025-12-10 10:26:51	136	159	2	5
223	2025-12-10 10:29:36	136	160	2	5
224	2025-12-10 10:34:12	136	161	2	5
225	2025-12-10 10:41:48	136	162	2	5
226	2025-12-10 10:43:39	136	163	2	5
227	2025-12-10 10:45:57	136	164	2	5
228	2025-12-10 10:47:23	136	165	2	5
264	2025-12-10 12:08:45	136	201	2	5
265	2025-12-10 13:36:30	136	202	2	5
266	2025-12-10 13:38:25	136	203	2	5
267	2025-12-10 13:40:05	136	204	2	5
296	2025-12-11 12:55:04	136	137	2	6
268	2025-12-11 11:37:13	136	49	2	6
269	2025-12-11 11:39:35	136	47	2	6
270	2025-12-11 12:20:30	136	54	2	6
271	2025-12-11 12:21:49	136	66	2	6
273	2025-12-11 12:27:02	136	89	2	6
274	2025-12-11 12:27:48	136	90	2	6
275	2025-12-11 12:28:44	136	72	2	6
276	2025-12-11 12:29:52	136	81	2	6
277	2025-12-11 12:32:31	136	91	2	6
279	2025-12-11 12:34:39	136	186	2	6
280	2025-12-11 12:35:32	136	122	2	6
281	2025-12-11 12:37:07	136	84	2	6
282	2025-12-11 12:38:22	136	75	2	6
283	2025-12-11 12:39:02	136	74	2	6
284	2025-12-11 12:40:25	136	77	2	6
285	2025-12-11 12:41:28	136	78	2	6
286	2025-12-11 12:42:52	136	125	2	6
287	2025-12-11 12:44:50	136	189	2	6
288	2025-12-11 12:45:37	136	192	2	6
289	2025-12-11 12:46:35	136	117	2	6
290	2025-12-11 12:48:26	136	198	2	6
291	2025-12-11 12:49:09	136	130	2	6
292	2025-12-11 12:51:39	136	207	2	6
293	2025-12-11 12:52:25	136	87	2	6
294	2025-12-11 12:53:35	136	131	2	6
295	2025-12-11 12:54:28	136	95	2	6
94	2025-08-11 12:24:45	139	37	1	4
95	2025-08-12 12:06:17	136	38	2	5
96	2025-08-12 12:22:27	136	39	2	5
97	2025-08-18 09:38:12	136	39	2	6
98	2025-08-18 13:32:55	136	43	2	6
100	2025-08-20 10:35:44	136	44	2	6
101	2025-08-20 10:35:44	136	44	2	5
102	2025-08-20 10:41:52	136	42	2	5
103	2025-08-20 10:43:51	136	41	2	5
104	2025-08-20 10:45:48	136	41	2	6
105	2025-08-20 10:48:05	136	40	2	6
106	2025-08-20 10:48:05	136	40	2	5
107	2025-09-29 12:49:53	139	45	1	4
110	2025-12-03 12:30:52	136	47	2	5
111	2025-12-03 12:41:43	136	48	2	5
112	2025-12-03 12:44:59	136	49	2	5
113	2025-12-04 11:02:06	136	50	2	5
114	2025-12-04 12:10:26	136	51	2	5
115	2025-12-04 12:14:54	136	53	2	5
116	2025-12-04 12:15:33	136	52	2	5
117	2025-12-04 12:21:52	136	54	2	5
118	2025-12-04 12:25:56	136	55	2	5
119	2025-12-04 12:29:39	136	56	2	5
120	2025-12-04 12:38:24	136	57	2	5
121	2025-12-04 12:42:40	136	58	2	5
229	2025-12-10 10:49:33	136	166	2	5
230	2025-12-10 10:51:51	136	167	2	5
231	2025-12-10 10:54:23	136	168	2	5
232	2025-12-10 10:56:37	136	169	2	5
233	2025-12-10 10:58:32	136	170	2	5
234	2025-12-10 11:00:36	136	171	2	5
235	2025-12-10 11:02:05	136	172	2	5
236	2025-12-10 11:06:31	136	173	2	5
237	2025-12-10 11:08:06	136	174	2	5
238	2025-12-10 11:09:39	136	175	2	5
239	2025-12-10 11:11:47	136	176	2	5
240	2025-12-10 11:13:13	136	177	2	5
241	2025-12-10 11:14:45	136	178	2	5
242	2025-12-10 11:16:45	136	179	2	5
243	2025-12-10 11:24:39	136	180	2	5
244	2025-12-10 11:30:33	136	181	2	5
245	2025-12-10 11:32:56	136	182	2	5
246	2025-12-10 11:34:17	136	183	2	5
247	2025-12-10 11:36:02	136	184	2	5
248	2025-12-10 11:38:23	136	185	2	5
249	2025-12-10 11:39:49	136	186	2	5
250	2025-12-10 11:43:48	136	187	2	5
251	2025-12-10 11:45:10	136	188	2	5
252	2025-12-10 11:47:47	136	189	2	5
253	2025-12-10 11:49:06	136	190	2	5
254	2025-12-10 11:50:25	136	191	2	5
255	2025-12-10 11:51:47	136	192	2	5
256	2025-12-10 11:55:06	136	193	2	5
257	2025-12-10 11:57:06	136	194	2	5
258	2025-12-10 11:58:30	136	195	2	5
259	2025-12-10 11:59:30	136	196	2	5
260	2025-12-10 12:00:27	136	197	2	5
261	2025-12-10 12:02:46	136	198	2	5
262	2025-12-10 12:05:39	136	199	2	5
263	2025-12-10 12:07:05	136	200	2	5
\.


--
-- TOC entry 5431 (class 0 OID 17147)
-- Dependencies: 241
-- Data for Name: sites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sites (id, name, location, address_name, created_by, updated_by, created_at, updated_at, description, client_id, check_in_distance) FROM stdin;
54	Ashfield Aquatic Centre	-33.88407983202126, 151.11922348083806	160 Elizabeth St, Ashfield NSW 2131	1	1	2025-12-04 12:21:52	2025-12-11 12:20:30	Roof and Gutter-2	\N	500
55	Ashfield Civic Centre	-33.889381517465324, 151.12423609325333	260 Liverpool Rd, Ashfield NSW 2131	1	1	2025-12-04 12:25:56	2025-12-04 12:25:56	Roof and Gutter-1	\N	500
56	Ashfield Early Learning Centre	-33.89164482850943, 151.1309155571675	10 Norton St, Ashfield NSW 2131	1	1	2025-12-04 12:29:39	2025-12-04 12:29:39	Roof and Gutter-4	\N	500
57	Ashfield Park Amenities Block Rotunda	-33.88460775098471, 151.13450784239615	 Parramatta Rd & Orpington Street, Ashfield , NSW,2131	1	1	2025-12-04 12:38:24	2025-12-04 12:38:24	Roof and Gutter-4	\N	500
58	Ashfield Park Begonia Summer House	-33.88460775098471, 151.13450784239615	 Parramatta Rd & Orpington Street, Ashfield , NSW,2131	1	1	2025-12-04 12:42:40	2025-12-04 12:43:24	Roof and Gutter-4	\N	500
59	Ashfield Park Bowling Club	-33.88494976588884, 151.1346866420097	Orpington St &, Parramatta Rd, Ashfield NSW 2131	1	1	2025-12-04 12:45:31	2025-12-04 12:45:31	Roof and Gutter-1	\N	500
60	Ashfield Park Pavilion Dressing Sheds	-33.88494976588884, 151.1346866420097	Orpington St &, Parramatta Rd, Ashfield NSW 2131	1	1	2025-12-04 12:49:51	2025-12-04 12:51:01	Roof and Gutter-1	\N	500
61	Balmain Depot - All Buildings	-33.85670386823523, 151.17682334921633	35 Llewellyn St, Balmain NSW 2041	1	1	2025-12-04 12:55:01	2025-12-04 12:55:01	Roof and Gutter-4	\N	500
62	Callan Park - Balmain Road Sporting Ground Toilets	-33.86427979930795, 151.15995690919544	South Crescent, Callan Park, Lilyfield NSW 2040	1	1	2025-12-04 13:15:04	2025-12-04 13:15:04	Roof and Gutter-4	\N	500
63	Balmain Early Childhood Centre	-33.85941998726784, 151.1722026115215	530 Darling St, Rozelle NSW 2039	1	1	2025-12-04 13:18:43	2025-12-04 13:18:43	Roof and Gutter-12	\N	500
64	Balmain East Craft Cottage (Little Nicholson Playgroup) 	-33.8577851555012, 151.19257893850795	13 Union St, Balmain East NSW 2041	1	1	2025-12-04 13:21:47	2025-12-04 13:21:47	Roof and Gutter-4	\N	500
65	Balmain East Play Room House (Little Nicholson Playgroup) 	-33.8577851555012, 151.19257893850795	13 Union St, Balmain East NSW 2041	1	1	2025-12-04 13:23:33	2025-12-04 13:24:09	Roof and Gutter-4	\N	500
66	Balmain Occasional Care	-33.85646926193266, 151.1769707250146	Rear of/370 Darling St, Balmain NSW 2041	1	1	2025-12-04 13:26:24	2025-12-11 12:21:49	Roof and Gutter-12	\N	500
67	Balmain Occasional Care - Strip drain & pit - Eastern side of building	-33.85647817154152, 151.17698145385017	Rear of/370 Darling St, Balmain NSW 2041	1	1	2025-12-04 13:28:54	2025-12-04 13:28:54	Roof and Gutter-12	\N	500
68	Balmain Town Hall - Glass House & external Public Toilets	-33.85607917066756, 151.17685126734352	Rear of/370 Darling St, Balmain NSW 2041	1	1	2025-12-04 13:32:23	2025-12-04 13:32:23	Roof and Gutter-12	\N	500
69	Balmain Town Hall	-33.85600789343763, 151.17674397898796	Rear of/370 Darling St, Balmain NSW 2041	1	1	2025-12-04 13:34:45	2025-12-04 13:34:45	Roof and Gutter-26	\N	500
70	Balmain Town Hall - Rainwater head - Library side courtyard	-33.8560524417133, 151.17687272501462	370 Darling St, Balmain NSW 2041	1	1	2025-12-04 13:49:29	2025-12-04 13:49:29	Roof and Gutter-26	\N	500
71	Dawn Fraser Baths - Southern Pavilion / Western Garage	-33.85372183117339, 151.1734169316709	Elkington Park, Fitzroy Ave, Balmain NSW 2041	1	1	2025-12-08 10:18:52	2025-12-08 10:18:52	Roof and Gutter-12	\N	500
72	Deborah Little Early Learning Centre	-33.905349110089276, 151.14388618268808	1 MacArthur Parade, Dulwich Hill NSW 2203	1	1	2025-12-08 10:21:08	2025-12-11 12:28:44	Roof and Gutter-12	\N	500
73	Deborah Little Early Learning Centre - strip drain - back of front building	-33.905349110089276, 151.14389691152363	1 MacArthur Parade, Dulwich Hill NSW 2203	1	1	2025-12-08 10:40:08	2025-12-08 10:40:08	Roof and Gutter-12	\N	500
74	Leichhardt Family Day Care	-33.88480173360365, 151.14746331337147	22 Foster St, Leichhardt NSW 2040	1	1	2025-12-08 10:45:22	2025-12-11 12:39:02	Roof and Gutter-12	\N	500
75	Leichhardt Early Learning Centre 	-33.88316126674958, 151.16002015582222	19 Leichhardt St, Leichhardt NSW 2040	1	1	2025-12-08 10:50:51	2025-12-11 12:38:22	Roof and Gutter-12	\N	500
76	Leichhardt Oval No.2 Amenities	-33.866722868428496, 151.15465985385055  	Glover St, Lilyfield NSW 2040	1	1	2025-12-08 10:54:13	2025-12-08 10:54:13	Roof and Gutter-12	\N	500
77	Leichhardt Park Aquatic Centre - All Buildings	-33.867718930343386, 151.1537133918495	Mary St, Lilyfield NSW 2040	1	1	2025-12-08 10:56:47	2025-12-11 12:40:25	Roof and Gutter-12	\N	500
78	Leichhardt Park Early Learning Centre	-33.86933272551132, 151.15363112316632	68 Mary St, Lilyfield NSW 2040	1	1	2025-12-08 10:59:49	2025-12-11 12:41:28	Roof and Gutter-12	\N	500
79	Balmain Town Hall - Strip drain - Library side courtyard	-33.85604353206005, 151.17688345385017	Rear of/370 Darling St, Balmain NSW 2041	1	1	2025-12-08 11:04:37	2025-12-08 11:04:37	Roof and Gutter-12	\N	500
80	Birchgrove Park Amenities	-33.85017977331191, 151.18063437029426	2 The Terrace, Birchgrove NSW 2041	1	1	2025-12-08 11:06:46	2025-12-08 11:06:46	Roof and Gutter-12	\N	500
81	Elkington Park Caretakers Cottage	-33.854018131224215, 151.17272858459268	Fitzroy Avenue, Balmain	1	1	2025-12-08 11:11:32	2025-12-11 12:29:52	Roof and Gutter-12	\N	500
82	H.J. Mahoney Park Amenities & Irrigation tank	-33.92086796138291, 151.14202418764845	570 Illawarra Rd, Marrickville NSW 2204	1	1	2025-12-08 11:13:24	2025-12-08 11:13:24	Roof and Gutter-12	\N	500
83	Hannaford Community Centre	-33.86143664612432, 151.17147780967252	608 Darling St, Rozelle NSW 2039	1	1	2025-12-08 11:15:17	2025-12-08 11:16:02	Roof and Gutter-12	\N	500
84	John McMahon Early Learning Centre	-33.85283269346861, 151.1834967403566	45 McKell St, Birchgrove NSW 2041	1	1	2025-12-08 11:17:45	2025-12-11 12:37:07	Roof and Gutter-12	\N	500
85	Portuguese Ethnographic Museum	-33.88825225371486, 151.17495955200286	24A Australia St, Camperdown NSW 2050	1	1	2025-12-08 11:19:11	2025-12-08 11:19:11	Roof and Gutter-12	\N	500
86	Portuguese Welfare Centre - White Room	-33.88972005050513, 151.1757257115229	24 Australia St, Camperdown NSW 2050	1	1	2025-12-08 11:21:24	2025-12-08 11:21:24	Roof and Gutter-12	\N	500
87	Tillman Park Early Learning Centre	-33.91722559497063, 151.1645925115242	79 Unwins Bridge Rd, Tempe NSW 2044	1	1	2025-12-08 11:23:31	2025-12-11 12:52:25	Roof and Gutter-12	\N	500
88	Tillman Park Toilets	-33.91714320588377, 151.16516254193297	292 Unwins Bridge Rd, Sydenham NSW 2044	1	1	2025-12-08 11:25:41	2025-12-08 11:25:41	Roof and Gutter-12	\N	500
89	Cavendish Street Early Learning Centre	-33.895952097948424, 151.16422212686535	142 Cavendish St, Stanmore NSW 2048	1	1	2025-12-08 11:27:33	2025-12-11 12:27:02	Roof and Gutter-12	\N	500
90	Clontarf Cottage	-33.85913375873671, 151.18813167658809	4 Wallace St, Balmain NSW 2041	1	1	2025-12-08 12:11:52	2025-12-11 12:27:48	Roof and Gutter-12	\N	500
91	Fanny Durack Aquatic Centre/ Plant / Kiosk 	-33.89135271823085, 151.15165581152294	Cnr Station Street and, Lotos St, Petersham NSW 2049	1	1	2025-12-08 12:13:42	2025-12-11 12:32:31	Roof and Gutter-12	\N	500
92	Jarvie Park Youth Centre	-33.90684208222776, 151.15605879591018	23 Yabsley Ave, Marrickville NSW 2204	1	1	2025-12-08 12:15:58	2025-12-08 12:15:58	Roof and Gutter-12	\N	500
93	Marrickville Legal Centre (Former Dulwich Hill Library)	-33.9031831409329, 151.1436255961813	12a Seaview St, Dulwich Hill NSW 2203	1	1	2025-12-08 12:21:20	2025-12-08 12:21:20	Roof and Gutter-12	\N	500
94	Summer Hill Depot	-33.89018980900886, 151.13142205385176	7 Prospect Rd, Summer Hill NSW 2131	1	1	2025-12-08 12:24:59	2025-12-08 12:24:59	Roof and Gutter-12	\N	500
95	Whites Creek Cottage and Stables	-33.87832962672715, 151.16733429618006	31 White St, Lilyfield NSW 2040	1	1	2025-12-08 12:26:46	2025-12-11 12:54:28	Roof and Gutter-12	\N	500
96	Callan Park Rec Hall (B504) - Wharf Road, Callan Park	-33.865428225654995, 151.15830644337368	Wharf Rd, Lilyfield NSW 2040	1	1	2025-12-08 12:33:24	2025-12-08 12:41:11	Roof and Gutter-4	\N	500
97	KU Crusader Kindergarten	-33.90767686679122, 151.15607090967487	53 Malakoff St, Marrickville NSW 2204	1	1	2025-12-08 12:43:58	2025-12-08 12:43:58	Roof and Gutter-4	\N	500
98	KU Summer Hill Kindergarten	-33.89195892590715, 151.13469084716726	Henson St &, Short St, Summer Hill NSW 2130	1	1	2025-12-08 12:48:07	2025-12-08 12:48:07	Roof and Gutter-4	\N	500
99	Birchgrove Park Pavilion/Referees Room	-33.8506968290644, 151.18208844755833	12 The Terrace, Birchgrove NSW 2041	1	1	2025-12-08 12:54:59	2025-12-08 12:54:59	Roof and Gutter-4	\N	500
100	Birchgrove Park Shed	-33.85064885234252, 151.1819266389121	12 The Terrace, Birchgrove NSW 2041	1	1	2025-12-08 12:56:38	2025-12-08 12:56:38	Roof and Gutter-4	\N	500
101	Birchgrove Park Tennis Pavilion	-33.85017325287468, 151.18010857262036	Rose St &, Louisa Rd, Birchgrove NSW 2041	1	1	2025-12-08 12:59:15	2025-12-08 12:59:15	Roof and Gutter-4	\N	500
102	Birchgrove Park Toilet Block/Garden Store	-33.85027613685588, 151.1806144261354	2 The Terrace, Birchgrove NSW 2041	1	1	2025-12-08 13:01:16	2025-12-08 13:01:16	Roof and Gutter-4	\N	500
103	Cohen Park Tennis Courts Amenities & Storage	-33.8764868846403, 151.16955627324637	380 Hutchinson La, Annandale NSW 2038	1	1	2025-12-08 13:39:03	2025-12-08 13:39:03	Roof and Gutter-4	\N	500
104	Gladstone Park Toilet Block	-33.858661960157654, 151.1828108596062	Darling Street, Darvall St, Balmain NSW 2041	1	1	2025-12-08 13:42:56	2025-12-08 13:42:56	Roof and Gutter-4	\N	500
105	Hawthorne Canal Café Bones	-33.87811656765754, 151.147467038509	 Hawthorne Canal Reserve, Leichhardt NSW 2040	1	1	2025-12-08 13:46:03	2025-12-15 12:04:34	Roof and Gutter-4	\N	500
106	Jack Shanahan Toilets	-33.90932092232846, 151.13861022500583	Hercules St, Dulwich Hill NSW 2203	1	1	2025-12-08 13:49:09	2025-12-08 13:49:09	Roof and Gutter-4	\N	500
107	Mackey Park - Pump House	-33.92045055163981, 151.15504273663043	Richardsons Cres, Marrickville NSW 2204	1	1	2025-12-08 13:50:52	2025-12-08 13:50:52	Roof and Gutter-4	\N	500
108	Mackey Park (Irrigation Tanks)\tMarrickville\t4\t	-33.92046907744863, 151.1550204113513	Richardsons Cres, Marrickville NSW 2204	1	1	2025-12-08 13:53:55	2025-12-08 13:53:55	Roof and Gutter-4	\N	500
109	Mackey Park Amenities/Kiosk	-33.920518479585844, 151.15503529487071	Richardsons Cres, Marrickville NSW 2204	1	1	2025-12-08 13:55:22	2025-12-08 13:55:22	Roof and Gutter-4	\N	500
110	Mackey Park Croquet Club Shed	-33.92264484948548, 151.15594534963446	Unnamed Road, 1 Richardsons Cres, Marrickville NSW 2204	1	1	2025-12-08 13:57:14	2025-12-08 13:57:14	Roof and Gutter-4	\N	500
111	Mackey Park, River Canoe Club	-33.922711277301204, 151.1555011736853	5 Richardsons Cres, Marrickville NSW 2204	1	1	2025-12-09 10:40:44	2025-12-09 10:40:44	Roof and Gutter-4	\N	500
112	Petersham Park Bandstand Rotunda	-33.891300091937886, 151.1507591986785	Brighton St, Sydney NSW 2049	1	1	2025-12-09 10:44:51	2025-12-09 10:44:51	Roof and Gutter-4	\N	500
113	Petersham Park Grandstand	-33.89152418807723, 151.14983018468382	2C West St, Lewisham NSW 2049	1	1	2025-12-09 10:46:47	2025-12-09 10:46:47	Roof and Gutter-4	\N	500
114	Petersham Park Score Board & Canteen	-33.891463325886136, 151.14977253538376	2C West St, Lewisham NSW 2049	1	1	2025-12-09 10:48:59	2025-12-09 10:48:59	Roof and Gutter-4	\N	500
115	Plumtree - Pathways 	-33.90662534433121, 151.15538088495677	Yabsley Ave, Marrickville NSW 2204	1	1	2025-12-09 10:53:27	2025-12-09 10:53:27	Roof and Gutter-4	\N	500
116	Chrissie Cotter Gallery	-33.88748402740339, 151.1763141099091	31A Pidcock St, Camperdown NSW 2050	1	1	2025-12-09 10:57:48	2025-12-09 10:57:48	Roof and Gutter-4	\N	500
117	Dulwich Hill Hall (Seaview St Hall)	-33.90312914077495, 151.14372299618125	12/14 Seaview St, Dulwich Hill NSW 2203	1	1	2025-12-09 11:00:36	2025-12-11 12:46:35	Roof and Gutter-4	\N	500
118	Dulwich Hill Languages School (Former Baby Health)	-33.90354029880187, 151.14370676880907	12-14 Seaview St, Dulwich Hill NSW 2203	1	1	2025-12-09 11:03:12	2025-12-09 11:03:12	Roof and Gutter-4	\N	500
119	Easton Park Amenities	-33.86923973106907, 151.17087716069503	Denison St, Rozelle NSW 2039	1	1	2025-12-09 11:05:05	2025-12-09 11:05:05	Roof and Gutter-4	\N	500
120	Frontyard (formerly ESP Gallery)	-33.909772392382486, 151.15672925385266	228 Illawarra Rd, Marrickville NSW 2204	1	1	2025-12-09 11:07:38	2025-12-09 11:07:38	Roof and Gutter-4	\N	500
121	Hammond Park Amenities Block	-33.877908671363485, 151.125764126456	34 Henry St, Ashfield NSW 2131	1	1	2025-12-09 11:13:04	2025-12-09 11:13:04	Roof and Gutter-4	\N	500
122	Herb Greedy Hall	-33.909502030672066, 151.1540365299149	79 Petersham Rd, Marrickville NSW 2204	1	1	2025-12-09 11:15:55	2025-12-11 12:35:32	Roof and Gutter-4	\N	500
123	Hoskins Park Toilets	-33.899547655747966, 151.14005863850997	Pigott St, Dulwich Hill NSW 2203	1	1	2025-12-09 11:18:06	2025-12-09 11:18:06	Roof and Gutter-4	\N	500
124	Leichhardt Depot - Amenities & Workshop buildings (All Buildings & Structures)	-33.87512137568337, 151.15989844246693	230/240 Balmain Rd, Leichhardt NSW 2040	1	1	2025-12-09 11:20:53	2025-12-09 11:20:53	Roof and Gutter-4	\N	500
125	Marrickville Library and Pavilion	-33.9085467732127, 151.15302636734603	313 Marrickville Rd, Marrickville NSW 2204	1	1	2025-12-09 11:22:32	2025-12-11 12:42:52	Roof and Gutter-4	\N	500
126	Marrickville Park Croquet Club	-33.90133456003972, 151.1512665538523	Entry via park, opposite the rose garden, Corner of Fraser St and, Lawson Ave, Marrickville NSW 2204	1	1	2025-12-09 11:24:17	2025-12-09 11:24:17	Roof and Gutter-4	\N	500
127	Marrickville Town Hall	-33.9089330906292, 151.15413556734592	303 Marrickville Rd, Marrickville NSW 2204	1	1	2025-12-09 11:25:44	2025-12-09 11:25:44	Roof and Gutter-4	\N	500
128	Mort Bay Park Toilet Block	-33.853075424320615, 151.1831165385077	45 McKell St, Birchgrove NSW 2041	1	1	2025-12-09 11:27:25	2025-12-09 11:27:25	Roof and Gutter-4	\N	500
129	Robson Park Amenities Dressing Room	-33.8710193630517, 151.14366258268637	Mortley Ave & Boomerang Street, Haberfield NSW 2045	1	1	2025-12-09 11:28:49	2025-12-09 11:28:49	Roof and Gutter-4	\N	500
130	Stanmore Library	-33.893633724422756, 151.16511586734532	Douglas St, Stanmore NSW 2048	1	1	2025-12-09 11:30:24	2025-12-11 12:49:09	Roof and Gutter-4	\N	500
131	Tom Foster Community Centre	-33.905724897279136, 151.18031215385247	11-13 Darley St, Newtown NSW 2042	1	1	2025-12-09 11:31:43	2025-12-11 12:53:35	Roof and Gutter-4	\N	500
132	Wicks Park Tennis Building	-33.90961241278646, 151.16310586313136	Cnr Sydenham Rd & Victoria Rd Wicks Park Wicks Ave, Sydenham Rd, Marrickville NSW 2204	1	1	2025-12-09 11:36:22	2025-12-09 11:36:22	Roof and Gutter-4	\N	500
133	Wicks Park Toilets	-33.90928284559836, 151.1628949000306	198 Victoria Rd, Marrickville NSW 2204	1	1	2025-12-09 11:39:17	2025-12-09 11:39:17	Roof and Gutter-4	\N	500
134	Wisdom Street Community Nursery	-33.878830920516506, 151.16824420967347	22 Wisdom St, Annandale NSW 2038	1	1	2025-12-09 11:40:49	2025-12-09 11:40:49	Roof and Gutter-4	\N	500
135	Yeo Park Amenities Block	-33.901995831844516, 151.13030794687262	Ashfield NSW 2131	1	1	2025-12-09 11:43:35	2025-12-09 11:43:35	Roof and Gutter-4	\N	500
136	Yeo Park Café	-33.90323414506641, 151.1294892430817	230 Victoria St, Ashfield NSW 2131	1	1	2025-12-09 11:45:17	2025-12-09 11:45:17	Roof and Gutter-4	\N	500
137	Yirran Gumal Early Learning Centre	-33.91912699669351, 151.1456117538531	2 Thornley St, Marrickville NSW 2204	1	1	2025-12-09 11:47:43	2025-12-11 12:55:04	Roof and Gutter-4	\N	500
138	KU Croydon Kindergarten	-33.88346849006465, 151.11783835200248	6 Railway St, Croydon NSW 2132	1	1	2025-12-09 11:52:13	2025-12-09 11:52:13	Roof and Gutter-1	\N	500
139	Rozelle Parklands Toilet Block	-33.86850315633759, 151.17267338083738	78 Lilyfield Rd, Rozelle NSW 2039	1	1	2025-12-09 11:53:42	2025-12-09 11:53:42	Roof and Gutter-1	\N	500
140	Bridgewater Park Amenities & Pergola	-33.859265868350235, 151.1662607250146	Margaret St, Rozelle NSW 2039	1	1	2025-12-09 12:36:16	2025-12-09 12:36:16	Roof and Gutter-1	\N	500
141	Centenary Park Amenities Building	-33.8753767210725, 151.11970672499035	132 Church St, Croydon NSW 2132	1	1	2025-12-09 12:41:03	2025-12-09 12:41:03	Roof and Gutter-1	\N	500
142	Elkington Park Toilet Block	-33.8537210753797, 151.17209495384998	White St, Balmain NSW 2041	1	1	2025-12-09 12:44:42	2025-12-09 12:44:42	Roof and Gutter-1	\N	500
143	Fenwick Building	-33.85706398275911, 151.1956877660644	2-8 Weston St, Balmain East NSW 2041	1	1	2025-12-09 12:46:47	2025-12-09 12:46:47	Roof and Gutter-1	\N	500
144	Camperdown Memorial Rest	-33.894248134563504, 151.1784358108735	Federation Road, Lennox and, Church St, Newtown NSW 2042	1	1	2025-12-10 09:38:17	2025-12-10 09:38:17	Roof and Gutter-2	\N	500
145	Gladstone Park Bowling Club	-33.85887312076999, 151.18278353850806	Darvall St, Balmain NSW 2041	1	1	2025-12-10 09:40:31	2025-12-10 09:40:31	Roof and Gutter-1	\N	500
146	Johnson Park Toilets	-33.900629668305314, 151.1376071673456	Constitution Rd, Dulwich Hill NSW 2203	1	1	2025-12-10 09:43:29	2025-12-10 09:43:29	Roof and Gutter-1	\N	500
147	Kendrick Park Toilets	-33.92744628573904, 151.15800637475732	2 View St, Tempe NSW 2044	1	1	2025-12-10 09:46:30	2025-12-10 09:46:30	Roof and Gutter-1	\N	500
148	Ryan Park (entrance shelter)	-33.915682397913386, 151.14891446734643	6-10 Roach St, Marrickville NSW 2204	1	1	2025-12-10 09:48:57	2025-12-10 09:48:57	Roof and Gutter-1	\N	500
149	Sydenham Green Amenities & Canteen	-33.91731016074601, 151.16809143455953	53 Railway Rd, Sydenham NSW 2044	1	1	2025-12-10 09:53:11	2025-12-10 09:53:11	Roof and Gutter-1	\N	500
150	Victoria Road Toilet Block	-33.869197918328815, 151.17361983522284	Victoria Rd, Rozelle NSW 2039	1	1	2025-12-10 10:01:18	2025-12-10 10:01:18	Roof and Gutter-1	\N	500
151	Brown Street Amenities Block	-33.88753846378933, 151.1247077668771	Brown St, Ashfield NSW 2131	1	1	2025-12-10 10:08:42	2025-12-10 10:08:42	Roof and Gutter-1	\N	500
152	Henson Park - Media Tower, Scoreboard Building, Main Switch Room	-33.90496266369061, 151.1571021026807	227 Sydenham Rd, Marrickville NSW 2204	1	1	2025-12-10 10:11:38	2025-12-10 10:11:38	Roof and Gutter-1	\N	500
153	Marrickville Park Amenities	-33.902877466851244, 151.15114493969156	Porter Ave, Marrickville NSW 2204	1	1	2025-12-10 10:12:44	2025-12-10 10:13:33	Roof and Gutter-1	\N	500
154	Marrickville Park Materials Store	-33.902827969350085, 151.15113301236067	Porter Ave, Marrickville NSW 2204	1	1	2025-12-10 10:14:54	2025-12-10 10:14:54	Roof and Gutter-1	\N	500
155	Marrickville Park Tennis Club House	-33.90288241659977, 151.15285651167775	Livingstone Rd, Marrickville NSW 2204	1	1	2025-12-10 10:16:24	2025-12-10 10:16:24	Roof and Gutter-1	\N	500
156	Marrickville SES	-33.91822418492412, 151.1690365385109	17 Railway Rd, Sydenham NSW 2044	1	1	2025-12-10 10:17:52	2025-12-10 10:17:52	Roof and Gutter-1	\N	500
157	Pioneer Memorial Park Rotunda	-33.878166437679624, 151.1574547690698	Norton St, Leichhardt NSW 2040	1	1	2025-12-10 10:19:54	2025-12-10 10:19:54	Roof and Gutter-1	\N	500
158	Richard Murden Reserve Amenities & Change Rooms - North	-33.88107807871778, 151.14503323149947	150 Hawthorne Parade, Haberfield NSW 2045	1	1	2025-12-10 10:24:12	2025-12-10 10:24:12	Roof and Gutter-1	\N	500
159	Richard Murden Reserve Amenities & Canteen - South	-33.87817903498024, 151.14665402755645	150 Hawthorne Parade, Haberfield NSW 2045	1	1	2025-12-10 10:26:51	2025-12-10 10:26:51	Roof and Gutter-1	\N	500
160	Simpson Park Toilets	-33.910916038259884, 151.17756564406181	Campbell St, St Peters NSW 2044	1	1	2025-12-10 10:29:36	2025-12-10 10:29:36	Roof and Gutter-1	\N	500
161	Summer Hill Car Park Toilets	-33.89095614214964, 151.1376117572484	Hardie Avenue Summer Hill NSW 2130	1	1	2025-12-10 10:34:12	2025-12-10 10:34:12	Roof and Gutter-1	\N	500
162	Callan Park Electricians Store (B703) - South Crescent	-33.866978334277675, 151.16366912822747	South Cres, Lilyfield NSW 2040	1	1	2025-12-10 10:41:48	2025-12-10 10:41:48	Roof and Gutter-2	\N	500
163	Debbie and Abbey Borgia Centre (DAB)	-33.91965260703851, 151.14530473851093	531 Illawarra Rd, Marrickville NSW 2204	1	1	2025-12-10 10:43:39	2025-12-10 10:43:39	Roof and Gutter-2	\N	500
164	Leichhardt Oval - all buildings 	-33.86900324102913, 151.15426022501512	68 Mary St, Lilyfield NSW 2040	1	1	2025-12-10 10:45:57	2025-12-10 10:45:57	Roof and Gutter-2	\N	500
165	Leichhardt Service Centre	-33.88279174973062, 151.1580017961803	7-15 Wetherill St, Leichhardt NSW 2040	1	1	2025-12-10 10:47:23	2025-12-10 10:47:23	Roof and Gutter-2	\N	500
166	Leichhardt Service Centre Demountable	-33.88273830853957, 151.15799106734474	7-15 Wetherill St, Leichhardt NSW 2040	1	1	2025-12-10 10:49:33	2025-12-10 10:49:33	Roof and Gutter-2	\N	500
167	Prospect Street Kindergarten	-33.88409652628597, 151.16010685590248	8 Prospect St, Leichhardt NSW 2040	1	1	2025-12-10 10:51:51	2025-12-10 10:51:51	Roof and Gutter-2	\N	500
168	Blackmore Oval (SES Building)	-33.874235564630155, 151.15018416129004	Canal Rd, Lilyfield NSW 2040	1	1	2025-12-10 10:54:23	2025-12-10 10:54:23	Roof and Gutter-2	\N	500
169	Blackmore Park Amenities Block/ Clubhouse  	-33.874190297877234, 151.15017767701968	Canal Rd, Lilyfield NSW 2040	1	1	2025-12-10 10:56:37	2025-12-10 10:56:37	Roof and Gutter-2	\N	500
170	Centenary Park Groundsmans Shed	-33.875554873614306, 151.11949214827925	132 Church St, Croydon NSW 2132	1	1	2025-12-10 10:58:32	2025-12-10 10:58:32	Roof and Gutter-2	\N	500
171	Elkington Park Bandstand	-33.85397522853993, 151.17271415268195	42 Glassop St, Balmain NSW 2041	1	1	2025-12-10 11:00:36	2025-12-10 11:00:36	Roof and Gutter-2	\N	500
172	King George Park Amenities Block	-33.863020536030156, 151.16362612383247	Rozelle NSW 2039	1	1	2025-12-10 11:02:05	2025-12-10 11:02:05	Roof and Gutter-2	\N	500
173	Leichhardt Park Caretakers Cottage	-33.86921776345812, 151.15425132031416	68 Mary St, Lilyfield NSW 2040	1	1	2025-12-10 11:06:31	2025-12-10 11:06:31	Roof and Gutter-2	\N	500
181	Calvert Street Car Park -Toilet Block	-33.91157276299727, 151.1554447502611	281-283 Illawarra Rd, Marrickville NSW 2204	1	1	2025-12-10 11:29:46	2025-12-10 11:30:33	Roof and Gutter-2	\N	500
182	Camperdown Park Amenities	-33.88892906828674, 151.1761960282417	Mallett St, Camperdown NSW 2050	1	1	2025-12-10 11:32:56	2025-12-10 11:32:56	Roof and Gutter-2	\N	500
183	Camperdown Park Rotunda	-33.8888768173711, 151.17619807288236	Mallett St, Camperdown NSW 2050	1	1	2025-12-10 11:34:17	2025-12-10 11:34:17	Roof and Gutter-2	\N	500
184	Camperdown Park Tennis Club/Camperdown Commons	-33.888199941426315, 151.17633218332676	33 Mallett St, Camperdown NSW 2050	1	1	2025-12-10 11:36:02	2025-12-10 11:36:02	Roof and Gutter-2	\N	500
185	Federation Plaza Amenities Block	-33.879678959049144, 151.13785968571835	110A Ramsay St, Haberfield NSW 2045	1	1	2025-12-10 11:38:23	2025-12-10 11:38:23	Roof and Gutter-2	\N	500
186	Haberfield Library	-33.87937669889918, 151.13920995931502	78 Dalhousie St, Haberfield NSW 2045	1	1	2025-12-10 11:39:49	2025-12-11 12:34:39	Roof and Gutter-2	\N	500
187	Henson Park Tennis Building	-33.90309563337404, 151.15792605744195	33 Centennial St, Marrickville NSW 2204	1	1	2025-12-10 11:43:48	2025-12-10 11:43:48	Roof and Gutter-2	\N	500
188	McNeilly Park Toilet	-33.913272724440965, 151.15081004937855	McNeilly Park, Jersey St, Marrickville NSW 2204	1	1	2025-12-10 11:45:10	2025-12-10 11:45:10	Roof and Gutter-2	\N	500
189	Mervyn Fletcher Hall Community Centre	-33.87953630769912, 151.13963108083783	81 Dalhousie St, Haberfield NSW 2045	1	1	2025-12-10 11:47:47	2025-12-11 12:44:50	Roof and Gutter-2	\N	500
190	Newtown Town Hall	-33.897804056834595, 151.17863115385205	326 King St, Newtown NSW 2042	1	1	2025-12-10 11:49:06	2025-12-10 11:49:06	Roof and Gutter-2	\N	500
191	Petersham Service Centre	-33.89457665503294, 151.156391652003	2-14 Fisher St, Petersham NSW 2049	1	1	2025-12-10 11:50:25	2025-12-10 11:50:25	Roof and Gutter-2	\N	500
192	Petersham Town Hall	-33.894676238449335, 151.15729846549644	107 Crystal St, Petersham NSW 2049	1	1	2025-12-10 11:51:47	2025-12-11 12:45:37	Roof and Gutter-2	\N	500
193	Pioneer Memorial Park Amenities Block/Tool Shed	-33.8774104083041, 151.15719273483592	1 William St, Leichhardt NSW 2040	1	1	2025-12-10 11:55:06	2025-12-10 11:55:06	Roof and Gutter-2	\N	500
194	 Eora Community Garden Shed SHARE Childrens Activity Centre 	-33.89088103273886, 151.13578488696308	135 Smith St, Summer Hill NSW 2130	1	1	2025-12-10 11:57:06	2025-12-11 11:06:46	Roof and Gutter-2	\N	500
195	St Peters Depot - Building A	-33.91249069806118, 151.17079448083933	15 Unwins Bridge Rd, St Peters NSW 2044	1	1	2025-12-10 11:58:30	2025-12-10 11:58:30	Roof and Gutter-2	\N	500
196	St Peters Depot - Building B	-33.912428371712615, 151.17081593851043	15 Unwins Bridge Rd, St Peters NSW 2044	1	1	2025-12-10 11:59:30	2025-12-10 11:59:30	Roof and Gutter-2	\N	500
197	St Peters Depot - Building C	-33.91252631309703, 151.17081593851043	15 Unwins Bridge Rd, St Peters NSW 2044	1	1	2025-12-10 12:00:27	2025-12-10 12:00:27	Roof and Gutter-2	\N	500
198	St Peters Town Hall	-33.915356477353065, 151.167341844365	39 Unwins Bridge Rd, Sydenham NSW 2044	1	1	2025-12-10 12:02:46	2025-12-11 12:48:26	Roof and Gutter-2	\N	500
199	Steel Park Amenities	-33.91962360098334, 151.1453456961821	531 Illawarra Rd, Marrickville NSW 2204	1	1	2025-12-10 12:05:39	2025-12-10 12:05:39	Roof and Gutter-2	\N	500
200	Summer Hill Community Centre	-33.8909964232458, 151.13626471152295	131 Smith St, Summer Hill NSW 2130	1	1	2025-12-10 12:07:05	2025-12-10 12:07:05	Roof and Gutter-2	\N	500
201	Tempe Reserve - Robyn Webster Building	-33.931221328287805, 151.1606595808404	Holbeach Ave, Tempe NSW 2044	1	1	2025-12-10 12:08:45	2025-12-10 12:08:45	Roof and Gutter-2	\N	500
202	Tempe Reserve Blue Amenities	-33.929377827419046, 151.16091702501808	Holbeach Ave, Tempe NSW 2044	1	1	2025-12-10 13:36:30	2025-12-10 13:36:30	Roof and Gutter-2	\N	500
203	Tempe Reserve Jets Sports Club	-33.92894065068099, 151.1596330961825	Tempe NSW 2044	1	1	2025-12-10 13:38:25	2025-12-10 13:38:25	Roof and Gutter-2	\N	500
204	Yeo Park Bandstand Rotunda	-33.90052203315147, 151.12951905385233	185 Victoria St, Ashfield NSW 2131	1	1	2025-12-10 13:40:05	2025-12-10 13:40:05	Roof and Gutter-2	\N	500
205	Balmain Town Hall & Library	-33.85583204357274, 151.17689094197198	Rear of/370 Darling St, Balmain NSW 2041	1	1	2025-12-11 12:25:39	2025-12-11 12:25:39	\N	\N	500
206	Globe Wilkins ELC	-33.900944134385746, 151.15485519433233	17 McRae St, Marrickville NSW 2204	1	1	2025-12-11 12:33:50	2025-12-11 12:33:50	\N	\N	500
37	Bayside Public Amenities	-33.955310609288254, 151.14647572689887	341 W Botany St, Rockdale NSW 2216	1	1	2025-08-11 12:16:36	2025-12-04 13:52:14	Sites: Scarborough Park Central South - Production Lane; Scarborough Park Central - Production Ave; Scarborough Park - Barton St (old Waratahs Club); Scarborough Park East - Monterey St; Arncliffe Park; Gardiner Park; Ador Ave Reserve; Rockdale Park; Tonbridge Reserve	\N	5000
38	100 A Silver Street	-33.910217560273686, 151.15730161534086	100A Silver St, Marrickville NSW 2204	1	1	2025-08-12 12:06:17	2025-08-12 12:06:17	100A Silver St, Marrickville NSW 2204	\N	500
39	Addison Road Early Learning Centre 	-33.903091917206474, 151.16189918257345	Hut 4, 142 Addison Rd, Marrickville NSW 2204	1	1	2025-08-12 12:10:55	2025-12-11 11:34:29	Roof and Gutter-12	\N	500
40	Enmore Child Care Centre	-33.90207035561492, 151.16910372845987	305 Enmore Rd, Marrickville NSW 2204	1	1	2025-08-12 12:48:08	2025-12-11 11:26:27	Roof and Gutter-12	\N	500
41	Jimmy Little Community Center	-33.868781798607046, 151.16703973839557	19 Cecily St, Lilyfield NSW 2040	1	1	2025-08-12 12:51:59	2025-12-11 12:36:07	Roof and Gutter-12	\N	500
42	KU Petersham Kindergarten	-33.89244698539483, 151.1518551032567	92a Brighton St, Petersham NSW 2049	1	1	2025-08-12 12:53:21	2025-12-04 11:07:18	Roof and Gutter-12	\N	500
43	Annandale Child Care Centre	-33.884615799948335, 151.17131668081976	47 Trafalgar St, Annandale NSW 2038	1	1	2025-08-18 13:32:55	2025-12-11 11:35:41	Annandale ELC	\N	500
44	May Murray Child Care Centre	-33.918722878215114, 151.15001335198613	35 Premier Street, Marrickville NSW 2204	1	1	2025-08-20 10:35:44	2025-12-11 12:43:28	Roof and Gutter-4	\N	500
45	Mascot Public Amenities	-33.930395759209766, 151.18973111666878	80 High St, Mascot NSW 2020	1	1	2025-09-29 12:49:53	2025-12-04 10:45:03	John Curtin Memorial Park	\N	2000
46	Office	-33.8698775551101, 151.12265181833078	49 Queens Rd, Five Dock NSW 2046	1	1	2025-11-27 10:50:26	2025-11-27 10:50:26	office	\N	100
47	  Annandale Community (Neighbourhood) CentreCenter	-33.88263628926509, 151.1703297318247	79 Johnston St, Annandale NSW 2038	1	1	2025-12-03 12:30:52	2025-12-11 11:39:35	Roof and Gutter- 12	\N	500
48	Algie Park Amenities Block	-33.876570387012116, 151.13653497356543	Alt street, Haberfield, NSW, 2045	1	1	2025-12-03 12:41:43	2025-12-03 12:41:43	Roof and Gutter-1	\N	500
49	Annette Kellerman Aquatic Centre Facility (AKAC)	-33.90444882450861, 151.17027268949673	27 Black St, Marrickville NSW 2204	1	1	2025-12-03 12:44:59	2025-12-11 11:37:13	Roof and Gutter-2	\N	500
50	Arlington Amenities Building	-33.90211924360756, 151.1373126805904	Williams Parade, Dulwich Hill, NSW,2203	1	1	2025-12-04 11:02:06	2025-12-04 11:02:06	Rood and Gutter-1	\N	500
51	Arlington Grandstand	-33.90211924360756, 151.1373126805904	Williams Parade, Dulwich Hill, NSW,2203	1	1	2025-12-04 12:10:26	2025-12-04 12:12:15	Roof and Gutter-1	\N	500
52	Arlington Kiosk	-33.90211924360756, 151.1373126805904	Williams Parade, Dulwich Hill, NSW,2203	1	1	2025-12-04 12:11:42	2025-12-04 12:15:33	Roof and Gutter-1	\N	500
53	Arlington Storage Room	-33.90211924360756, 151.1373126805904	Williams Parade, Dulwich Hill, NSW,2203	1	1	2025-12-04 12:13:39	2025-12-04 12:14:54	Roof and Gutter-1	\N	500
174	Leichhardt Town Hall	-33.88322066899279, 151.15741042501585	Corner of Marion and, 107 Norton St, Leichhardt NSW 2040	1	1	2025-12-10 11:08:06	2025-12-10 11:08:06	Roof and Gutter-2	\N	500
175	Pratten Park - All Amenites/scoreboard/grandstand Building	-33.892736898402056, 151.1232476463478	40 Arthur St, Ashfield NSW 2131	1	1	2025-12-10 11:09:39	2025-12-10 11:09:39	Roof and Gutter-2	\N	500
176	Pratten Park Tennis Clubhouse	-33.89274204308573, 151.12317947060873	40 Arthur St, Ashfield NSW 2131	1	1	2025-12-10 11:11:47	2025-12-10 11:11:47	Roof and Gutter-2	\N	500
177	Pratten Park Thirning Villa	-33.8921927603648, 151.12377957710592	40 Arthur St, Ashfield NSW 2131	1	1	2025-12-10 11:13:13	2025-12-10 11:13:13	Roof and Gutter-2	\N	500
178	Punch Park Tennis Amenities / Clubhouse/ New Ameneties	-33.860701330585, 151.1792460598679	16-30 Wortley St, Balmain NSW 2041	1	1	2025-12-10 11:14:45	2025-12-10 11:14:45	Roof and Gutter-2	\N	500
179	Stone Villa	-33.91810792840696, 151.16866778782958	19 Railway Rd, Sydenham NSW 2044	1	1	2025-12-10 11:16:45	2025-12-10 11:16:45	Roof and Gutter-2	\N	500
180	War Memorial Park Toilet Block	-33.87912617176508, 151.16411683850893	Corner Catherine and Moore Street, Leichhardt NSW 2040	1	1	2025-12-10 11:24:39	2025-12-10 11:24:39	Roof and Gutter-2	\N	500
207	Tempe Leachate Plant	-33.92939652631663, 151.1609021084363	Holbeach Ave, Tempe NSW 2044	1	1	2025-12-11 12:51:39	2025-12-11 12:51:39	\N	\N	500
\.


--
-- TOC entry 5432 (class 0 OID 17153)
-- Dependencies: 242
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff (user_id, start_date, ratings, company_name) FROM stdin;
138	2025-08-05 13:54:06	1	\N
140	2024-07-11 12:27:08	1	\N
141	2022-06-15 11:56:50	3	\N
\.


--
-- TOC entry 5433 (class 0 OID 17157)
-- Dependencies: 243
-- Data for Name: task_shift_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task_shift_logs (id, task_id, shift_id, created_at, type, type_value, start_date, end_date, status, updated_by, updated_at, created_by, task_name, shift_name, action, task_shift_id) FROM stdin;
\.


--
-- TOC entry 5435 (class 0 OID 17164)
-- Dependencies: 245
-- Data for Name: task_shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task_shifts (id, task_id, created_at, "from", "to", reminder_times, reminder_day) FROM stdin;
\.


--
-- TOC entry 5437 (class 0 OID 17170)
-- Dependencies: 247
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tasks (id, name, site_item_id, created_by, updated_by, created_at, updated_at, description, report_template_id, status, "order", staff_id, type, type_value, start_date, end_date, reminder_times, reminder_day) FROM stdin;
\.


--
-- TOC entry 5439 (class 0 OID 17178)
-- Dependencies: 249
-- Data for Name: ticket_answers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ticket_answers (id, ticket_id, message, created_at, user_id, updated_at, created_by, updated_by, type, attach_files) FROM stdin;
\.


--
-- TOC entry 5441 (class 0 OID 17186)
-- Dependencies: 251
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tickets (id, customer_id, site_id, priority, message, attach_files, created_by, updated_by, created_at, updated_at, status, subject, service_name, site_name, customer_name, sender, company_name, service_id) FROM stdin;
\.


--
-- TOC entry 5443 (class 0 OID 17193)
-- Dependencies: 253
-- Data for Name: user_daily_job_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_daily_job_items (id, user_daily_job_id, created_at, type, check_in, check_out) FROM stdin;
1	1	2026-05-17 08:00:00	1	2026-05-17 08:00:00	2026-05-17 16:30:00
2	2	2026-05-18 07:45:00	1	2026-05-18 07:45:00	2026-05-18 15:15:00
3	3	2026-05-19 09:10:00	1	2026-05-19 09:10:00	2026-05-19 17:00:00
4	4	2026-05-20 08:30:00	1	2026-05-20 08:30:00	2026-05-20 16:45:00
5	5	2026-05-21 08:00:00	1	2026-05-21 08:00:00	2026-05-22 12:00:00
6	6	2026-05-22 07:30:00	1	2026-05-22 07:30:00	2026-05-30 15:02:55
7	7	2026-05-25 13:49:25.415	1	2026-05-25 13:49:25.415	2026-05-25 13:53:05.477
8	7	2026-05-25 13:53:05.477	2	2026-05-25 13:49:25.415	2026-05-25 13:53:05.477
\.


--
-- TOC entry 5445 (class 0 OID 17198)
-- Dependencies: 255
-- Data for Name: user_daily_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_daily_jobs (id, site_id, site_location, staff_id, created_by, updated_by, created_at, updated_at, date) FROM stdin;
1	37	-33.955310609288254, 151.14647572689887	140	140	140	2026-05-17 08:00:00	2026-05-17 08:00:00	2026-05-17 00:00:00
2	37	-33.955310609288254, 151.14647572689887	140	140	140	2026-05-18 07:45:00	2026-05-18 07:45:00	2026-05-18 00:00:00
3	37	-33.955310609288254, 151.14647572689887	140	140	140	2026-05-19 09:10:00	2026-05-19 09:10:00	2026-05-19 00:00:00
4	37	-33.955310609288254, 151.14647572689887	140	140	140	2026-05-20 08:30:00	2026-05-20 08:30:00	2026-05-20 00:00:00
5	37	-33.955310609288254, 151.14647572689887	140	140	140	2026-05-21 08:00:00	2026-05-21 08:00:00	2026-05-21 00:00:00
6	37	-33.955310609288254, 151.14647572689887	140	140	140	2026-05-22 07:30:00	2026-05-22 07:30:00	2026-05-22 00:00:00
7	46	-33.8698793494547,151.12284632893267	138	138	138	2026-05-25 13:49:25.412	2026-05-25 13:53:05.468	2026-05-25 13:49:25.412
\.


--
-- TOC entry 5447 (class 0 OID 17203)
-- Dependencies: 257
-- Data for Name: user_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_groups (user_id, group_id, created_at) FROM stdin;
\.


--
-- TOC entry 5448 (class 0 OID 17208)
-- Dependencies: 258
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (id, user_id, role_id, created_at) FROM stdin;
953	1	ADMIN	\N
961	150	ADMIN	2026-05-29 10:14:16.31
\.


--
-- TOC entry 5479 (class 0 OID 44609)
-- Dependencies: 289
-- Data for Name: user_task_admin_visibility; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_task_admin_visibility (id, user_task_id, user_id, badge_dismissed_at) FROM stdin;
2	142	142	2026-05-25 15:44:37.690956
3	144	142	2026-05-25 15:44:37.690956
4	163	142	2026-05-25 15:44:37.690956
5	168	142	2026-05-25 15:44:37.690956
6	169	142	2026-05-25 15:44:37.690956
7	173	142	2026-05-25 15:44:37.690956
8	177	142	2026-05-25 15:44:37.690956
9	186	142	2026-05-25 15:44:37.690956
10	188	142	2026-05-25 15:44:37.690956
11	191	142	2026-05-25 15:44:37.690956
12	194	142	2026-05-25 15:44:37.690956
13	201	142	2026-05-25 15:44:37.690956
14	138	142	2026-05-25 15:44:37.690956
15	136	142	2026-05-25 15:44:37.690956
16	140	142	2026-05-25 15:44:37.690956
17	164	142	2026-05-25 15:44:37.690956
18	167	142	2026-05-25 15:44:37.690956
20	198	142	2026-05-25 15:44:37.690956
21	200	142	2026-05-25 15:44:37.690956
22	143	142	2026-05-25 15:44:37.690956
23	145	142	2026-05-25 15:44:37.690956
24	149	142	2026-05-25 15:44:37.690956
25	150	142	2026-05-25 15:44:37.690956
26	155	142	2026-05-25 15:44:37.690956
27	161	142	2026-05-25 15:44:37.690956
28	162	142	2026-05-25 15:44:37.690956
29	189	142	2026-05-25 15:44:37.690956
30	202	142	2026-05-25 15:44:37.690956
31	206	142	2026-05-25 15:44:37.690956
33	134	142	2026-05-25 15:44:37.690956
34	133	142	2026-05-25 15:44:37.690956
35	170	142	2026-05-25 15:44:37.690956
36	178	142	2026-05-25 15:44:37.690956
37	182	142	2026-05-25 15:44:37.690956
38	174	142	2026-05-25 15:44:37.690956
39	184	142	2026-05-25 15:44:37.690956
40	193	142	2026-05-25 15:44:37.690956
41	196	142	2026-05-25 15:44:37.690956
44	197	142	2026-05-25 15:44:37.690956
45	199	142	2026-05-25 15:44:37.690956
47	137	142	2026-05-25 15:44:37.690956
48	204	142	2026-05-25 15:44:37.690956
49	207	142	2026-05-25 15:44:37.690956
50	135	142	2026-05-25 15:44:37.690956
51	139	142	2026-05-25 15:44:37.690956
52	146	142	2026-05-25 15:44:37.690956
53	151	142	2026-05-25 15:44:37.690956
54	160	142	2026-05-25 15:44:37.690956
75	142	150	2026-05-29 10:15:50.744437
76	144	150	2026-05-29 10:15:50.744437
77	163	150	2026-05-29 10:15:50.744437
78	168	150	2026-05-29 10:15:50.744437
79	169	150	2026-05-29 10:15:50.744437
80	173	150	2026-05-29 10:15:50.744437
81	177	150	2026-05-29 10:15:50.744437
82	186	150	2026-05-29 10:15:50.744437
83	188	150	2026-05-29 10:15:50.744437
84	191	150	2026-05-29 10:15:50.744437
85	194	150	2026-05-29 10:15:50.744437
86	201	150	2026-05-29 10:15:50.744437
91	174	150	2026-05-29 10:15:50.744437
93	138	150	2026-05-29 10:15:50.744437
95	136	150	2026-05-29 10:15:50.744437
96	140	150	2026-05-29 10:15:50.744437
98	164	150	2026-05-29 10:15:50.744437
99	167	150	2026-05-29 10:15:50.744437
103	198	150	2026-05-29 10:15:50.744437
104	200	150	2026-05-29 10:15:50.744437
107	143	150	2026-05-29 10:15:50.744437
108	145	150	2026-05-29 10:15:50.744437
109	149	150	2026-05-29 10:15:50.744437
110	150	150	2026-05-29 10:15:50.744437
111	155	150	2026-05-29 10:15:50.744437
112	161	150	2026-05-29 10:15:50.744437
113	162	150	2026-05-29 10:15:50.744437
114	189	150	2026-05-29 10:15:50.744437
120	133	150	2026-05-29 10:15:50.744437
121	202	150	2026-05-29 10:15:50.744437
122	206	150	2026-05-29 10:15:50.744437
123	134	150	2026-05-29 10:15:50.744437
124	170	150	2026-05-29 10:15:50.744437
125	178	150	2026-05-29 10:15:50.744437
126	182	150	2026-05-29 10:15:50.744437
127	184	150	2026-05-29 10:15:50.744437
128	193	150	2026-05-29 10:15:50.744437
129	196	150	2026-05-29 10:15:50.744437
132	197	150	2026-05-29 10:15:50.744437
133	199	150	2026-05-29 10:15:50.744437
134	137	150	2026-05-29 10:15:50.744437
135	204	150	2026-05-29 10:15:50.744437
136	207	150	2026-05-29 10:15:50.744437
137	135	150	2026-05-29 10:15:50.744437
138	139	150	2026-05-29 10:15:50.744437
139	146	150	2026-05-29 10:15:50.744437
140	151	150	2026-05-29 10:15:50.744437
141	160	150	2026-05-29 10:15:50.744437
\.


--
-- TOC entry 5477 (class 0 OID 44470)
-- Dependencies: 287
-- Data for Name: user_task_customer_visibility; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_task_customer_visibility (id, user_task_id, user_id, hidden_at, badge_dismissed_at, opened_at, cleared_at) FROM stdin;
57	142	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
114	142	145	\N	\N	2026-05-19 13:52:35.530879	\N
3	142	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
58	144	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
117	144	145	\N	\N	2026-05-19 13:52:35.530879	\N
4	144	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
59	163	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
120	163	145	\N	\N	2026-05-19 13:52:35.530879	\N
5	163	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
60	168	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
123	168	145	\N	\N	2026-05-19 13:52:35.530879	\N
6	168	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
61	169	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
126	169	145	\N	\N	2026-05-19 13:52:35.530879	\N
7	169	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
62	173	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
129	173	145	\N	\N	2026-05-19 13:52:35.530879	\N
8	173	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
63	177	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
132	177	145	\N	\N	2026-05-19 13:52:35.530879	\N
9	177	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
64	186	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
135	186	145	\N	\N	2026-05-19 13:52:35.530879	\N
10	186	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
65	188	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
138	188	145	\N	\N	2026-05-19 13:52:35.530879	\N
11	188	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
66	191	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
141	191	145	\N	\N	2026-05-19 13:52:35.530879	\N
12	191	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
67	194	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
144	194	145	\N	\N	2026-05-19 13:52:35.530879	\N
13	194	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
68	201	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
147	201	145	\N	\N	2026-05-19 13:52:35.530879	\N
14	201	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
69	138	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
150	138	145	\N	\N	2026-05-19 13:52:35.530879	\N
15	138	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
70	136	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
153	136	145	\N	\N	2026-05-19 13:52:35.530879	\N
16	136	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
71	140	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
156	140	145	\N	\N	2026-05-19 13:52:35.530879	\N
17	140	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
72	164	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
159	164	145	\N	\N	2026-05-19 13:52:35.530879	\N
18	164	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
73	167	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
162	167	145	\N	\N	2026-05-19 13:52:35.530879	\N
19	167	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
75	198	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
168	198	145	\N	\N	2026-05-19 13:52:35.530879	\N
21	198	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
76	200	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
171	200	145	\N	\N	2026-05-19 13:52:35.530879	\N
22	200	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
77	143	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
174	143	145	\N	\N	2026-05-19 13:52:35.530879	\N
23	143	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
78	145	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
177	145	145	\N	\N	2026-05-19 13:52:35.530879	\N
24	145	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
79	149	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
180	149	145	\N	\N	2026-05-19 13:52:35.530879	\N
25	149	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
80	150	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
183	150	145	\N	\N	2026-05-19 13:52:35.530879	\N
26	150	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
81	155	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
186	155	145	\N	\N	2026-05-19 13:52:35.530879	\N
27	155	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
82	161	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
189	161	145	\N	\N	2026-05-19 13:52:35.530879	\N
28	161	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
83	162	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
192	162	145	\N	\N	2026-05-19 13:52:35.530879	\N
29	162	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
84	189	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
195	189	145	\N	\N	2026-05-19 13:52:35.530879	\N
30	189	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
85	202	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
198	202	145	\N	\N	2026-05-19 13:52:35.530879	\N
31	202	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
201	206	145	\N	\N	2026-05-19 13:52:35.530879	\N
32	206	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
87	134	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
204	134	145	\N	\N	2026-05-19 13:52:35.530879	\N
33	134	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
88	133	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
207	133	145	\N	\N	2026-05-19 13:52:35.530879	\N
34	133	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
89	170	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
210	170	145	\N	\N	2026-05-19 13:52:35.530879	\N
35	170	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
90	178	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
213	178	145	\N	\N	2026-05-19 13:52:35.530879	\N
36	178	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
91	182	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
216	182	145	\N	\N	2026-05-19 13:52:35.530879	\N
37	182	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
92	174	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
222	174	145	\N	\N	2026-05-19 13:52:35.530879	\N
39	174	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
93	184	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
225	184	145	\N	\N	2026-05-19 13:52:35.530879	\N
40	184	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
94	193	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
228	193	145	\N	\N	2026-05-19 13:52:35.530879	\N
41	193	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
95	196	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
231	196	145	\N	\N	2026-05-19 13:52:35.530879	\N
42	196	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
98	197	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
243	197	145	\N	\N	2026-05-19 13:52:35.530879	\N
45	197	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
99	199	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
246	199	145	\N	\N	2026-05-19 13:52:35.530879	\N
46	199	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
101	137	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
249	137	145	\N	\N	2026-05-19 13:52:35.530879	\N
48	137	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
102	204	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
252	204	145	\N	\N	2026-05-19 13:52:35.530879	\N
49	204	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
103	207	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
255	207	145	\N	\N	2026-05-19 13:52:35.530879	\N
50	207	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
104	135	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
258	135	145	\N	\N	2026-05-19 13:52:35.530879	\N
51	135	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
105	139	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
261	139	145	\N	\N	2026-05-19 13:52:35.530879	\N
52	139	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
106	146	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
264	146	145	\N	\N	2026-05-19 13:52:35.530879	\N
53	146	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
107	151	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
267	151	145	\N	\N	2026-05-19 13:52:35.530879	\N
54	151	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
108	160	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
270	160	145	\N	\N	2026-05-19 13:52:35.530879	\N
55	160	146	\N	2026-05-25 16:07:49.897888	2026-05-19 13:52:35.530879	\N
319	209	139	\N	2026-05-29 12:08:55.739872	2026-05-29 12:09:26.199218	\N
86	206	139	\N	2026-05-25 16:28:52.631322	2026-05-19 13:52:35.530879	\N
\.


--
-- TOC entry 5450 (class 0 OID 17214)
-- Dependencies: 260
-- Data for Name: user_task_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_task_reports (id, name, type, created_at, value, user_task_id, "order") FROM stdin;
1464	Is the Premises safe to enter?	YES_NO	2026-05-22 13:53:33.221	YES	258	2
1465	Photos – Cleaning Service Compliance	IMAGES	2026-05-22 13:53:33.221	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779422012702-WhatsApp_Image_2025-05-26_at_11.29.50_4f6203b4.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779422012742-WhatsApp_Image_2025-05-26_at_11.29.50_4fccfbbc.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779422012790-WhatsApp_Image_2025-05-26_at_11.29.50_6a92d8ff.jpg"]	258	3
1466	Site Name	[SITE_NAME]	2026-05-29 10:55:10.604	H.J. Mahoney Park Amenities & Irrigation tank	208	1
1467	Site Address:	[SITE_ADDRESS]	2026-05-29 10:55:10.604	570 Illawarra Rd, Marrickville NSW 2204	208	2
1468	Date:	[REPORT_DATE]	2026-05-29 10:55:10.604	2026-05-29	208	3
1469	Overhanging tree brances?	YES_NO	2026-05-29 10:55:10.604	NO	208	4
1470	Clear gutters of debris?	YES_NO	2026-05-29 10:55:10.604	YES	208	6
1471	Blow roof and leaves	YES_NO	2026-05-29 10:55:10.604	YES	208	7
1472	IS Condition of the roof and gutters good?	YES_NO	2026-05-29 10:55:10.604	YES	208	9
1473	Have you introduced yourself to the staff onsite and advised you are commencing work?	YES_NO	2026-05-29 10:55:10.604	YES	208	10
1474	Are all staff attending site wearing appropriate PPE & Uniform ?	YES_NO	2026-05-29 10:55:10.604	YES	208	11
1475	Is the premises safe to enter?	YES_NO	2026-05-29 10:55:10.604	YES	208	12
1476	Before photos	IMAGES	2026-05-29 10:55:10.604	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016105262-WhatsApp_Image_2025-05-26_at_11.29.50_3ccc7c30.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016105284-WhatsApp_Image_2025-05-26_at_11.29.50_4cfb54dd.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016105335-WhatsApp_Image_2025-05-26_at_11.29.50_4f6203b4.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016105369-WhatsApp_Image_2025-05-26_at_11.29.50_4fccfbbc.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016105715-WhatsApp_Image_2025-05-26_at_11.29.50_6a92d8ff.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016105802-WhatsApp_Image_2025-05-26_at_11.29.50_6a255cf0.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016105884-WhatsApp_Image_2025-05-26_at_11.29.50_9a75a35c.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016105981-WhatsApp_Image_2025-05-26_at_11.29.50_9ec45c1e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016106080-WhatsApp_Image_2025-05-26_at_11.29.50_75d0a6e2.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016106228-WhatsApp_Image_2025-05-26_at_11.29.50_316e22fc.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016106329-WhatsApp_Image_2025-05-26_at_11.29.50_543a7c34.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016106408-WhatsApp_Image_2025-05-26_at_11.29.50_622b4b53.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016106488-WhatsApp_Image_2025-05-26_at_11.29.50_536476a9.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016106587-WhatsApp_Image_2025-05-26_at_11.29.50_943157db.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016106726-WhatsApp_Image_2025-05-26_at_11.29.50_2299312d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016106805-WhatsApp_Image_2025-05-26_at_11.29.50_14319603.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016106901-WhatsApp_Image_2025-05-26_at_11.29.50_a5eb888e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016107022-WhatsApp_Image_2025-05-26_at_11.29.50_aa159dde.jpg"]	208	13
1477	After photos	IMAGES	2026-05-29 10:55:10.604	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016107415-WhatsApp_Image_2025-05-26_at_11.29.43_3eba05a0.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016107459-WhatsApp_Image_2025-05-26_at_11.29.44_56a93760.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016107502-WhatsApp_Image_2025-05-26_at_11.29.48_15e9727f.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016107543-WhatsApp_Image_2025-05-26_at_11.29.49_4bfddf2d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016107775-WhatsApp_Image_2025-05-26_at_11.29.49_8fbfd288.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016107890-WhatsApp_Image_2025-05-26_at_11.29.49_d5ec9652.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016108043-WhatsApp_Image_2025-05-26_at_11.29.50_3ccc7c30.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016108138-WhatsApp_Image_2025-05-26_at_11.29.50_4cfb54dd.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016108217-WhatsApp_Image_2025-05-26_at_11.29.50_4f6203b4.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016108315-WhatsApp_Image_2025-05-26_at_11.29.50_4fccfbbc.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016108412-WhatsApp_Image_2025-05-26_at_11.29.50_6a92d8ff.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016108512-WhatsApp_Image_2025-05-26_at_11.29.50_6a255cf0.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016108609-WhatsApp_Image_2025-05-26_at_11.29.50_9a75a35c.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016108703-WhatsApp_Image_2025-05-26_at_11.29.50_9ec45c1e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016108802-WhatsApp_Image_2025-05-26_at_11.29.50_75d0a6e2.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016108898-WhatsApp_Image_2025-05-26_at_11.29.50_316e22fc.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016108997-WhatsApp_Image_2025-05-26_at_11.29.50_543a7c34.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016109093-WhatsApp_Image_2025-05-26_at_11.29.50_622b4b53.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016109192-WhatsApp_Image_2025-05-26_at_11.29.50_536476a9.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016109287-WhatsApp_Image_2025-05-26_at_11.29.50_943157db.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016109382-WhatsApp_Image_2025-05-26_at_11.29.50_2299312d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016109480-WhatsApp_Image_2025-05-26_at_11.29.50_14319603.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016109575-WhatsApp_Image_2025-05-26_at_11.29.50_a5eb888e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016109672-WhatsApp_Image_2025-05-26_at_11.29.50_aa159dde.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016109768-WhatsApp_Image_2025-05-26_at_11.29.50_abc089f8.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016109863-WhatsApp_Image_2025-05-26_at_11.29.50_af8c01ea.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016109958-WhatsApp_Image_2025-05-26_at_11.29.50_afb5820d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016110054-WhatsApp_Image_2025-05-26_at_11.29.50_b8f4411c.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016110150-WhatsApp_Image_2025-05-26_at_11.29.50_bb30c3e5.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780016110244-WhatsApp_Image_2025-05-26_at_11.29.50_c518d788.jpg"]	208	14
1478	Tiime and Date	[REPORT_DATE]	2026-05-29 11:58:31.427	2026-05-29	209	1
1479	Is the Premises safe to enter?	YES_NO	2026-05-29 11:58:31.427	YES	209	2
1480	After Photos – Cleaning Service Compliance	IMAGES	2026-05-29 11:58:31.427	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780019910964-WhatsApp_Image_2025-05-26_at_11.29.43_3eba05a0.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780019911001-WhatsApp_Image_2025-05-26_at_11.29.44_56a93760.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-29/1780019911035-WhatsApp_Image_2025-05-26_at_11.29.48_15e9727f.jpg"]	209	3
1437	Any Maintenance issues?	YES_NO	2026-05-21 14:16:53.991	YES	254	8
1438	Clear gutters of debris?	YES_NO	2026-05-21 14:16:53.991	NO	254	9
1005	Is the Premises safe to enter?	YES_NO	2025-10-08 21:49:57	YES	163	1
921	Date	DATETIME	2025-09-27 00:19:24	2025 Sep 27 12:19 am	133	0
922	Is the Premises safe to enter?	YES_NO	2025-09-27 00:19:24	YES	133	1
923	Photos – Cleaning Service Compliance	IMAGES	2025-09-27 00:19:24	["http://api.service360.com.au/public/upload/files/IMG-20250926-WA0071-9d81.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0070-5eda.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0069-a810f.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0065-e78b.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0061-b5fd.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0057-4a105.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0053-b6ac.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0054-1483.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0058-4484.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0067-76d3.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0063-04bb.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0059-0eec.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0055-a450.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0056-61fd.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0060-a7b3.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0068-2456.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0049-64bb.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0015-e6b6.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0042-1010104.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0038-cf86.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0039-30d7.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0046-f8e5.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0050-933f.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0051-0758.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0047-6fc3.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0044-cb62.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0040-98f7.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0041-a992.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0052-b12f.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0048-7f86.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0045-fb15.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0043-1aff.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0034-7dbb.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0030-0996.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0026-57ae.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0022-0e91.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0023-e7b7.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0027-fe32.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0031-cca1.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0035-0501.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0036-6dcd.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0032-e77b.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0028-50fb.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0024-65d2.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0025-41f8.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0029-d6bc.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0033-b35b.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0037-820c.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0018-8de0.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0019-d140.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0020-39c5.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0021-9b9b.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0017-21021.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0016-e50b.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0014-91a2.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0013-30ae.jpg","http://api.service360.com.au/public/upload/files/IMG-20250926-WA0012-b262.jpg"]	133	3
924	Date	DATETIME	2025-09-27 00:41:32	2025 Sep 27 12:41 am	134	0
925	Is the Premises safe to enter?	YES_NO	2025-09-27 00:41:32	YES	134	1
926	Photos – Cleaning Service Compliance	IMAGES	2025-09-27 00:41:32	["http://api.service360.com.au/public/upload/files/IMG-20250927-WA0047-199e.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0043-a998.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0031-10f25.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0030-1c3a.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0042-2ff9.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0044-47101.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0041-326b.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0046-5ea10.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0045-d279.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0040-fd1c.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0036-78f8.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0032-daa5.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0033-7e66.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0037-0db7.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0038-1253.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0034-0f610.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0035-41059.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0039-01e0.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0028-aba6.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0029-f788.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0024-b85d.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0020-53d0.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0016-63f8.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0017-cbf8.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0021-84bf.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0025-b10ff.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0026-f55b.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0022-29b4.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0018-b10e2.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0019-51088.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0023-c543.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0027-42b9.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0012-36ca.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0008-c81a.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0004-7773.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0000-2e47.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0001-cb6f.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0002-1b13.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0003-d9d8.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0007-9142.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0006-a1b3.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0005-b108f.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0009-db7f.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0010-13ce.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0011-510df.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0015-d879.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0014-b105.jpg","http://api.service360.com.au/public/upload/files/IMG-20250927-WA0013-aa59.jpg"]	134	2
927	Date	DATETIME	2025-09-29 22:15:43	2025 Sep 29 10:15 pm	135	0
928	Is the Premises safe to enter?	YES_NO	2025-09-29 22:15:43	YES	135	1
929	Photos – Cleaning Service Compliance	IMAGES	2025-09-29 22:15:43	["http://api.service360.com.au/public/upload/files/IMG-20250929-WA0063-6451.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0062-37cd.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0061-edc2.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0060-2fcd.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0058-3c09.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0057-e321.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0054-28a5.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0053-98a9.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0052-fd66.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0050-6ec2.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0059-7998.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0056-f10da.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0055-5aeb.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0051-536f.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0049-d1e9.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0048-6267.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0047-2fa9.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0046-a83a.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0045-92b4.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0044-a98c.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0043-6223.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0042-9e2b.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0041-0077.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0040-c4ef.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0039-72ca.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0038-32c4.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0037-150f.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0036-37d7.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0035-41107.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0034-13c8.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0033-895d.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0032-8dd2.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0031-9758.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0030-5ed2.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0029-1a33.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0028-caa8.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0027-f87d.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0026-d42d.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0010-de0e.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0025-8fc4.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0024-1282.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0023-32b8.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0022-99101.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0021-77dd.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0020-32eb.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0019-0f1e.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0018-23110.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0017-adfe.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0016-10dad.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0015-baf6.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0014-6254.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0013-ac26.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0012-86d3.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0011-fdd10.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0009-e510e.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0008-9a17.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0007-48a7.jpg"]	135	3
930	Date	DATETIME	2025-09-29 22:47:43	2025 Sep 29 10:47 pm	136	0
931	Is the Premises safe to enter?	YES_NO	2025-09-29 22:47:43	YES	136	1
932	Photos – Cleaning Service Compliance	IMAGES	2025-09-29 22:47:43	["http://api.service360.com.au/public/upload/files/IMG-20250929-WA0115-9020.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0114-f5e6.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0113-56e6.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0112-1f81.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0111-d1a10.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0110-aa54.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0109-e236.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0108-506f.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0107-63fb.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0106-1c21.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0105-38cc.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0104-f7c3.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0103-1fe3.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0102-5885.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0101-dd11.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0100-5eb2.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0099-7e1f.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0098-4196.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0097-a8fc.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0096-a738.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0095-ea42.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0094-d7af.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0093-c192.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0092-d9f4.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0091-00110.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0090-f729.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0089-7343.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0088-3959.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0087-c10f.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0086-254d.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0082-d5ed.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0083-f81c.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0084-67fc.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0085-10bac.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0081-9a47.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0117-b547.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0116-473f.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0080-74fa.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0079-e095.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0078-a7b0.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0076-1d87.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0075-faf6.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0074-16c4.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0073-97a8.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0072-376a.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0071-5726.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0070-e418.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0069-4073.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0068-71e1.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0067-81eb.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0066-aaa8.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0065-a5b8.jpg","http://api.service360.com.au/public/upload/files/IMG-20250929-WA0064-8f7b.jpg"]	136	2
933	Date	DATETIME	2025-10-01 09:34:07	2025 Oct 01 9:34 am	137	0
934	Is the Premises safe to enter?	YES_NO	2025-10-01 09:34:07	YES	137	1
935	Photos – Cleaning Service Compliance	IMAGES	2025-10-01 09:34:07	["http://api.service360.com.au/public/upload/files/IMG-20251001-WA0061-dfb8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0060-95710.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0059-3fbc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0058-e857.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0057-8e14.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0056-7eb6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0055-56ee.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0054-5bb6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0053-0a25.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0052-fdbc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0051-33bb.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0050-2d55.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0049-f746.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0048-82ec.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0047-27a8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0046-82a2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0045-54a6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0044-253e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0043-e485.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0042-3002.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0041-84a4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0040-9403.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0039-899b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0038-bdbe.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0037-7d33.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0036-d610c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0035-c1005.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0034-1b2f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0033-74d6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0032-32e10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0031-e6c1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0030-da59.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0029-fd410.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0028-5262.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0027-eb8d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0026-8acc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0025-4856.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0024-bcad.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0023-485c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0022-267d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0021-5cb1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0020-0375.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0019-a24d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0018-b69e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0017-4194.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0016-8814.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0015-1b5f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0014-91d4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0013-71054.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0012-982e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0011-33ab.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0010-2aae.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0009-4bb10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0008-9313.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0007-2bdc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0006-4c41.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0005-d17c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0004-13dd.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0003-49a4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0002-b6f0.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0001-e71c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0000-8695.jpg"]	137	3
936	Date	DATETIME	2025-10-01 09:52:05	2025 Oct 01 9:52 am	138	0
937	Is the Premises safe to enter?	YES_NO	2025-10-01 09:52:05	YES	138	1
938	Photos – Cleaning Service Compliance	IMAGES	2025-10-01 09:52:05	[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]	138	2
939	Date	DATETIME	2025-10-01 22:22:15	2025 Oct 01 10:22 pm	139	0
940	Is the Premises safe to enter?	YES_NO	2025-10-01 22:22:15	YES	139	1
941	Photos – Cleaning Service Compliance	IMAGES	2025-10-01 22:22:15	["http://api.service360.com.au/public/upload/files/IMG-20251001-WA0227-647f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0228-fbd4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0229-feff.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0230-1fb8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0226-838e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0225-109b4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0224-c5c2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0223-b376.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0219-3856.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0220-cece.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0221-cf95.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0222-06e6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0218-c1c5.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0217-cd108.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0216-c83c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0215-10ec3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0211-fd3e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0212-31f9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0213-fc7c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0214-ceac.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0207-7110e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0208-176d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0209-1303.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0210-bbbf.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0203-5100f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0204-10e5f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0205-251b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0206-589a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0199-62fb.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0200-e478.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0201-de8d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0202-6a2e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0195-0fcb.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0196-f8ae.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0197-f58e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0198-7427.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0191-6033.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0192-b588.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0193-10e58.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0194-25e5.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0187-80107.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0188-2af8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0189-6b14.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0190-f7c5.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0183-1cef.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0184-8dc8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0185-6f4b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0186-1825.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0179-d7ac.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0181-bc7a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0182-13ab.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0175-4d810.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0176-f829.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0177-be6f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0178-a3ef.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0171-e191.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0173-9110c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0174-6fc1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0180-b6e6.jpg"]	139	3
942	Date	DATETIME	2025-10-01 23:37:06	2025 Oct 01 11:37 pm	140	0
943	Is the Premises safe to enter?	YES_NO	2025-10-01 23:37:06	YES	140	1
944	Photos – Cleaning Service Compliance	IMAGES	2025-10-01 23:37:06	["http://api.service360.com.au/public/upload/files/IMG-20251001-WA0279-e161.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0277-b38e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0276-f988.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0275-c1e1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0274-e3106.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0273-64f7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0272-5a4e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0271-a287.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0270-5ca8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0269-ea101.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0268-6bc7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0267-3562.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0266-55d8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0265-277f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0264-5254.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0263-3f95.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0262-3f3b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0261-b4b3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0260-5ee3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0259-eaf4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0258-19109.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0235-bda0.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0257-d7ea.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0256-ce63.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0255-d3e3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0254-e5eb.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0253-871b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0252-c6d2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0251-5254.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0250-4c810.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0249-ed18.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0248-9c75.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0247-49d2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0246-50bf.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0245-810f9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0244-cd40.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0243-3087.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0242-0f7a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0241-8069.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0240-f3ad.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0239-c174.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0238-3de6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0237-689d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0236-553a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0233-defb.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0232-91009.jpg","http://api.service360.com.au/public/upload/files/IMG-20251001-WA0231-a7910.jpg"]	140	2
945	Date:	DATETIME	2025-10-02 13:19:51	2025 Oct 02 1:19 pm	141	0
946	Site Name	SELECT	2025-10-02 13:19:51	site1,site2,site3	141	1
947	Date	DATETIME	2025-10-02 23:37:22	2025 Oct 02 11:37 pm	142	0
948	Is the Premises safe to enter?	YES_NO	2025-10-02 23:37:22	YES	142	1
949	Photos – Cleaning Service Compliance	IMAGES	2025-10-02 23:37:22	["http://api.service360.com.au/public/upload/files/IMG-20251002-WA0106-3c21.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0107-d7ad.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0108-6cb9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0109-ef10d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0110-2c51.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0111-2c2d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0112-8f810.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0113-4122.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0114-f1f5.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0115-afa8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0116-d5c1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0117-9aa4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0118-a10a10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0119-e6b9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0120-9c3b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0121-f8c1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0123-6d0e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0122-2aa3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0124-a69c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0125-ad39.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0126-b218.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0105-1513.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0127-6303.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0129-e8c3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0130-ec7a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0128-1408.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0131-c74b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0132-b4c6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0133-a219.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0134-4f3b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0135-0df5.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0136-6a0a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0137-d1d9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0138-195f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0139-43b0.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0140-f359.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0141-cf12.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0142-13210.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0143-56f10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0144-863e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0145-0b96.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0146-3499.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0147-666e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0148-167f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0149-1629.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0150-a1d7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0151-bfdd.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0152-3b64.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0153-5910c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0154-a9b6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0155-1f2d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0156-9263.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0157-4d70.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0158-7384.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0159-b857.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0160-36cc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0161-6af5.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0162-9bda.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0163-ca86.jpg"]	142	3
950	Date	DATETIME	2025-10-02 23:44:05	2025 Oct 02 11:44 pm	143	0
951	Is the Premises safe to enter?	YES_NO	2025-10-02 23:44:05	YES	143	1
952	Photos – Cleaning Service Compliance	IMAGES	2025-10-02 23:44:05	["http://api.service360.com.au/public/upload/files/IMG-20251002-WA0214-5283.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0213-c36e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0212-01c4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0211-1998.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0207-c273.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0208-f769.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0209-ab2b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0210-710c7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0206-c251.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0205-b104.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0204-83c9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0203-2916.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0199-fdfe.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0200-8ba2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0201-7468.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0202-d2d4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0198-109f7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0197-f39e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0196-1031f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0195-7339.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0191-bbf0.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0192-dc3b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0193-23e4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0194-64f2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0190-9d89.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0189-f10b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0188-1622.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0187-ec94.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0183-2676.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0184-98c1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0185-5761.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0186-9147.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0182-75b9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0181-f68d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0180-0f84.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0179-dc20.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0175-b1026.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0176-249c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0177-b1a3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0178-259e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0171-92310.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0172-ceed.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0173-74a6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0174-5210f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0170-9b7b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0169-3ae3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0168-4fef.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0167-947d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0163-3ed7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0164-5e43.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0165-e5ab.jpg","http://api.service360.com.au/public/upload/files/IMG-20251002-WA0166-414e.jpg"]	143	2
953	Date	DATETIME	2025-10-04 07:48:34	2025 Oct 04 7:48 am	144	0
954	Is the Premises safe to enter?	YES_NO	2025-10-04 07:48:34	YES	144	1
955	Photos – Cleaning Service Compliance	IMAGES	2025-10-04 07:48:34	["http://api.service360.com.au/public/upload/files/IMG-20251003-WA0021-f3f6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0022-f508.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0023-b976.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0024-8ecf.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0025-89ae.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0026-ead3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0027-3102e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0028-57d2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0029-521e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0030-10a44.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0031-0136.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0032-7257.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0033-fe9c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0034-f761.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0035-c9c4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0036-4d29.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0037-246b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0038-cea2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0039-2132.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0040-3ce8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0041-cb7e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0042-9b2d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0043-f12f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0044-a42e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0045-f764.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0046-1588.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0048-9ee1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0049-b37b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0050-983f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0051-7f8c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0066-d0a8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0074-d8a2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0047-7e97.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0052-c10b5.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0053-2c43.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0054-044d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0055-8be2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0056-3dc4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0057-f891.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0058-7c93.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0059-d227.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0060-96db.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0061-2ed10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0062-cad10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0063-887a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0064-78ac.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0065-ee2d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0067-a54a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0068-f3c4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0069-a2b2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0070-5d96.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0071-31d1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0072-52c10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0073-f6210.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0075-bc26.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0076-fc73.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0077-889a.jpg"]	144	3
956	Date	DATETIME	2025-10-04 07:54:04	2025 Oct 04 7:54 am	145	0
957	Is the Premises safe to enter?	YES_NO	2025-10-04 07:54:04	YES	145	1
958	Photos – Cleaning Service Compliance	IMAGES	2025-10-04 07:54:04	["http://api.service360.com.au/public/upload/files/IMG-20251003-WA0078-231b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0079-510fc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0080-3ef10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0081-d98b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0082-2bbd.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0083-8c18.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0084-58d1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0085-491a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0086-305a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0087-6f87.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0088-a1aa.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0089-4e17.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0090-3a18.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0091-ae3b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0092-fae7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0093-68d3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0094-4df4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0095-8ffd.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0096-a135.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0097-6fcc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0098-cf8c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0099-2a7e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0100-b8ca.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0102-5a33.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0103-9313.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0104-e299.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0105-0963.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0106-1a5b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0107-62e8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0108-555e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0109-df26.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0110-615b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0111-3a97.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0112-1ebd.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0113-7095.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0114-7222.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0115-fdff.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0116-d76f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0117-a81a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0119-31bf.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0120-a1d10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0123-47d8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0121-7116.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0122-281a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0124-91021.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0125-b76d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0126-72610.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0127-5fda.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0129-a8b1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0131-d021.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0132-041b.jpg"]	145	2
959	Date	DATETIME	2025-10-05 09:30:58	2025 Oct 05 9:30 am	146	0
960	Is the Premises safe to enter?	YES_NO	2025-10-05 09:30:58	YES	146	1
961	Photos – Cleaning Service Compliance	IMAGES	2025-10-05 09:30:58	["http://api.service360.com.au/public/upload/files/IMG-20251004-WA0054-101aa.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0053-a4a2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0052-c556.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0051-c92b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0050-d618.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0049-4f7b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0048-02ab.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0047-e82a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0046-935f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0045-5493.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0044-1058.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0043-7f73.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0042-b9c6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0041-4e79.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0040-aa91.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0039-6e3b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0038-7091.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0037-16fb.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0036-10dae.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0035-c562.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0034-d4a4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0033-cb11.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0032-2c9f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0031-aef8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0021-dea8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0022-4d16.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0023-be6e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0024-f0c7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0025-4dbc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0026-cde10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0027-988a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0028-4a39.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0029-bb79.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0030-52da.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0031-1114.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0032-a10c1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0033-910a3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0034-1084a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0035-a872.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0036-5a10f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0037-8106.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0038-61a5.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0039-d366.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0040-932a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0041-1326.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0042-9c21.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0043-9081.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0044-104cb.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0045-d56c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0046-88fb.jpg","http://api.service360.com.au/public/upload/files/IMG-20251003-WA0048-a1072.jpg"]	146	3
966	Date	DATETIME	2025-10-05 09:45:06	2025 Oct 05 9:45 am	149	0
967	Is the Premises safe to enter?	YES_NO	2025-10-05 09:45:06	YES	149	1
968	Photos – Cleaning Service Compliance	IMAGES	2025-10-05 09:45:06	["http://api.service360.com.au/public/upload/files/IMG-20251004-WA0113-955f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0112-0a5c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0111-10c4c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0110-e89f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0109-0d77.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0108-b5f10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0107-8716.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0106-4daa.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0102-16bb.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0103-bc9e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0104-111f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0105-5395.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0101-3d3f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0100-c108e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0099-d632.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0098-d5ac.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0097-3ffc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0095-c9d1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0094-9b65.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0090-d5bd.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0091-101f3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0092-d9e9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0093-95e9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0089-8aa3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0088-1cd6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0087-de60.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0086-61910.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0082-21a1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0083-41e5.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0084-0a3e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0085-4257.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0080-d6bc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0081-6749.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0078-bd1f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0079-5ae3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0076-7103e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0077-3e77.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0075-616c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0074-8094.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0072-e4b1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0071-6f83.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0070-6347.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0066-6e710.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0068-90a7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0069-537f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0067-d29f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0065-6e4a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0064-f851.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0063-d3af.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0062-6d6a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0058-a757.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0059-c200.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0060-e925.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0061-1cc10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0056-541a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0057-d19c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251004-WA0055-8a2f.jpg"]	149	2
969	Date	DATETIME	2025-10-05 23:43:58	2025 Oct 05 11:43 pm	150	0
970	Is the Premises safe to enter?	YES_NO	2025-10-05 23:43:58	YES	150	1
971	Photos – Cleaning Service Compliance	IMAGES	2025-10-05 23:43:58	[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]	150	2
972	Date	DATETIME	2025-10-05 23:49:20	2025 Oct 05 11:49 pm	151	0
973	Is the Premises safe to enter?	YES_NO	2025-10-05 23:49:20	YES	151	1
974	Photos – Cleaning Service Compliance	IMAGES	2025-10-05 23:49:20	["http://api.service360.com.au/public/upload/files/IMG-20251005-WA0114-b92b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0113-4b49.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0112-0b11.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0111-ba19.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0110-7602.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0109-eb47.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0108-10edd.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0107-4f28.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0106-af27.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0105-a59d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0104-23ea.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0103-ef37.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0102-2674.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0101-eff3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0100-9b8d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0099-aba1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0098-7325.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0097-ad00.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0096-84f3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0095-35c2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0094-6990.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0093-c9102.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0092-c88c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0091-db15.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0090-9226.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0089-61049.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0088-96b2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0087-d108f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0086-0bd4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0085-28be.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0084-1482.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0083-8d49.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0082-87a10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0081-62fc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0080-fac1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0079-bcfa.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0078-71e7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0077-a910b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0076-f54d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0075-eac7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0074-9d101.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0073-8c2b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0072-fce9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0071-7e13.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0069-369c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0070-2de5.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0068-55c5.jpg","http://api.service360.com.au/public/upload/files/IMG-20251005-WA0067-3862.jpg"]	151	3
981	Date	DATETIME	2025-10-06 23:33:24	2025 Oct 06 11:33 pm	155	0
982	Is the Premises safe to enter?	YES_NO	2025-10-06 23:33:24	YES	155	1
983	Photos – Cleaning Service Compliance	IMAGES	2025-10-06 23:33:24	["http://api.service360.com.au/public/upload/files/IMG-20251006-WA0139-d1ad.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0129-d8d4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0138-e889.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0137-f998.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0136-d191.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0135-ecae.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0134-6fee.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0133-6fdb.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0132-ffde.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0131-959d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0130-afe7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0128-8f1d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0127-4010c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0126-168f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0125-f224.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0124-70bf.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0123-3ca1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0122-37c9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0121-8d610.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0120-8220.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0119-d7e4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0118-2acd.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0117-a802.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0116-1b93.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0115-9573.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0114-2281.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0113-25d2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0112-65d3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0111-aeaa.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0110-eff10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0109-8c09.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0108-10615.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0107-4138.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0106-281f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0105-9d0d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0104-3edb.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0103-77d4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0102-3795.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0101-6825.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0100-ab58.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0099-1de1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0097-3486.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0096-d798.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0093-6416.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0092-517d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0091-6db4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0090-2f77.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0089-214e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0088-377b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0087-65ac.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0086-2234.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0085-a32d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0084-1360.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0082-addb.jpg","http://api.service360.com.au/public/upload/files/IMG-20251006-WA0081-b610d.jpg"]	155	2
992	Date	DATETIME	2025-10-07 23:16:46	2025 Oct 07 11:16 pm	160	0
993	Is the Premises safe to enter?	YES_NO	2025-10-07 23:16:46	YES	160	1
994	Photos – Cleaning Service Compliance	IMAGES	2025-10-07 23:16:46	["http://api.service360.com.au/public/upload/files/IMG-20251007-WA0061-da38.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0060-1610f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0059-eb76.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0058-f886.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0057-0599.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0056-a815.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0055-9d37.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0054-98e9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0053-0b87.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0052-b572.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0051-3b0e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0050-004b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0049-4bed.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0048-c9b2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0047-75fb.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0045-923c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0046-fcbc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0044-b7cf.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0043-353d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0042-394d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0041-df1e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0040-e275.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0039-caf9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0038-10ba2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0037-1566.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0036-b031.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0035-b720.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0034-cf86.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0032-8966.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0031-1210c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0030-0aef.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0029-3a78.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0028-4487.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0027-cbad.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0026-20d6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0025-10194.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0024-00d7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0022-c6de.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0021-afbf.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0020-0043.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0019-75da.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0017-1329.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0033-f66a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0018-86d10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0016-e1bf.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0013-934c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0023-7382.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0014-3f98.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0012-05a2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0015-b88d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0011-e23f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0010-49a2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0009-c12a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0008-756e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0007-4693.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0006-5f44.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0004-fa19.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0005-107b6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0002-491e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0003-ac3d.jpg"]	160	3
995	Date	DATETIME	2025-10-07 23:37:46	2025 Oct 07 11:37 pm	161	0
996	Is the Premises safe to enter?	YES_NO	2025-10-07 23:37:46	YES	161	1
1119	Date	DATETIME	2025-10-25 09:45:44	2025 Oct 25 9:45 am	207	0
1120	Is the Premises safe to enter?	YES_NO	2025-10-25 09:45:44	YES	207	1
997	Photos – Cleaning Service Compliance	IMAGES	2025-10-07 23:37:46	["http://api.service360.com.au/public/upload/files/IMG-20251007-WA0120-0b7a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0119-5582.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0118-e10d8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0117-e673.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0116-f98c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0115-fb19.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0114-7eaf.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0113-b63c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0112-c0f4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0111-b104b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0110-f4810.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0109-9e47.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0108-398f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0107-36cc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0106-a6b0.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0105-109f10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0104-de11.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0103-ef7c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0102-8814.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0101-a5da.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0100-784c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0099-1c33.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0098-05b9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0097-41c2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0096-43c3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0095-2ec3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0094-f746.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0093-6624.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0092-f407.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0091-79fc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0090-6789.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0089-f592.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0088-ba3e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0087-e36b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0086-1e5e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0085-bda8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0084-1cb2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0083-4644.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0082-1ec10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0081-0c3b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0080-ea5d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0079-f5d7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0078-66a10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0077-34f4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0076-368b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0075-3e45.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0074-fc5e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0073-751b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0072-2e14.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0071-eafe.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0070-98bf.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0069-c4e9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0068-a725.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0067-3507.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0066-faae.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0064-1675.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0063-d2b2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0062-1e45.jpg","http://api.service360.com.au/public/upload/files/IMG-20251007-WA0065-e425.jpg"]	161	2
998	Section One - Excutive Summary	RESIZEALE_TEXTBOX	2025-10-08 11:28:13	Service Delivery \nServicelink will continue to deliver the full service to IWC council under the term and agreement by providing a weekly report with time stamped photos, and all reports sent to facilities@innerwest.nsw.gov.au.  \n\n	162	1
999	Section Two - Contract Review 	RESIZEALE_TEXTBOX	2025-10-08 11:28:13	Insurance : Both workers comp and public liability is up to date and registered with BNG Conserve\nAccreditations : All ISO accreditions up to date \nPeriodicals : All sites inspected and above on agreed KPI of 85% average is 87%\nResponse : All additional request responded to within the agreed  time frame,\nStaff Toolbox talk Training : Two tool box talks conducted first one for “Siging in and out on time ”  & second Spray bottle not matching SDS sheet. \nNew starters Police check & Visa check : Nil\nSafety Audit\t : All safety audits were completed for all sites, all cleaners rooms are compliant, bottles are labelled correctly and all equipment & electrical leads are tested and tagged and  are current.  And asset register updated.\n	162	2
1000	Section Three - Inspections 	RESIZEALE_TEXTBOX	2025-10-08 11:28:13	All inspection has been completed for all the childcare below \n\nSite Name\n1\tAddison ELC\n2\tAnnandale ELC\n3\tAshfield Aquatic Centre\n4\tBalmain Childhood Health Centre\n5\tBalmain Glass House\n6\tBalmain Library /Town Hall \n7\tBalmain Occasional Care \n8\tCavendish St. ELC\n9\tDeborah Little ELC\n\tEnmore ELC\n10\tEnmore Resource Center \n11\tGlobe Wilkins ELC \n12\tJimmy Little Community Centre\n13\tJohn McMahon ELC\n14\tKU Crusader Preschool\n15\tKU Henson Street Preschool\n16\tKU Petersham Preschool\n17\tLeichhardt Bus Depot \n18\tLeichhardt ELC\n19\tLeichhardt Family Day Care\n20\tLeichhardt Library\n21\tLeichhardt Park Aquatic Centre \n22\tLeichhardt Park ELC\n23\tMay Murray ELC\n24\tRozelle Bay Community Nursery\n25\tSeaview Street Community Hall\n26\tTillman Park ELC\n27\tYirran Gumal ELC\n	162	3
1001	Section Four - Staffing 	RESIZEALE_TEXTBOX	2025-10-08 11:28:13	Staff Changes -    \n•\tNew staff   - Deborah Little Childcare \n	162	4
1002	Sective Five - Financials 	RESIZEALE_TEXTBOX	2025-10-08 11:28:13	1 Overdue Invoice\n•\tNo outstanding invoices all paid up to date\n•\tNovember Invoices have been submitted to AP \n	162	5
1003	Section Six-  Appendix 	IMAGES	2025-10-08 11:28:13	["http://api.service360.com.au/public/upload/files/1-1ba3.jpg","http://api.service360.com.au/public/upload/files/11-c173.png","http://api.service360.com.au/public/upload/files/images-8f1a.jpeg","http://api.service360.com.au/public/upload/files/cleaning_cart-d4a2.webp"]	162	6
1004	Date	DATETIME	2025-10-08 21:49:57	2025 Oct 08 9:49 pm	163	0
1006	Photos – Cleaning Service Compliance	IMAGES	2025-10-08 21:49:57	["http://api.service360.com.au/public/upload/files/IMG-20251008-WA0204-cc36.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0203-3de3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0202-fcff.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0201-108fa.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0200-110c9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0199-510e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0198-63a2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0197-eeb1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0196-7084.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0195-6550.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0194-31018.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0193-7d68.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0192-9c51.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0191-10bd5.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0190-a9d3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0189-5c24.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0188-10475.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0187-7b7c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0186-e25c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0185-a7f8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0184-e722.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0183-5ad6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0182-2522.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0181-81063.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0180-b28a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0179-bb2e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0178-daff.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0177-ced8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0176-10d44.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0175-76d7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0174-79eb.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0173-c69e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0172-97100.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0171-38ea.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0170-e755.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0169-46e9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0168-163d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0167-9529.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0166-0ef1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0165-5e10d.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0164-6b88.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0163-6bc2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0162-2417.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0161-b0d6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0159-a697.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0160-e72c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0158-98b8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0148-8e28.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0157-66c8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0156-fd5f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0155-23cc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0154-45f7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0153-7387.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0152-d583.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0151-f613.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0150-8bfc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0149-b5e8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0147-b9b0.jpg"]	163	3
1007	Date	DATETIME	2025-10-08 23:04:04	2025 Oct 08 11:04 pm	164	0
1008	Is the Premises safe to enter?	YES_NO	2025-10-08 23:04:04	YES	164	1
1009	Photos – Cleaning Service Compliance	IMAGES	2025-10-08 23:04:04	["http://api.service360.com.au/public/upload/files/IMG-20251008-WA0267-8de4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0215-aa34.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0219-e8ea.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0255-e586.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0266-d5a7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0265-1739.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0264-0c24.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0263-7b79.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0262-cb110.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0261-77bc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0260-1d28.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0259-9ea6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0257-8f39.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0256-a862.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0254-e1094.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0253-3d52.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0252-63aa.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0251-106e2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0250-aad8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0249-3a29.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0248-d31b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0247-82e9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0246-4f34.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0245-75ae.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0244-a1f9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0243-388c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0242-b2a10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0241-b10ff.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0240-b8e0.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0239-6e1e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0238-d15e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0237-71023.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0236-614f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0235-d793.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0234-e23e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0233-5d5f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0232-ef43.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0231-e1e7.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0230-6e49.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0229-d8a3.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0228-fccb.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0227-58fa.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0226-8ee1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0225-9217.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0224-d6103.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0223-f422.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0222-cce4.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0221-2118.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0220-3111.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0218-b910c.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0217-d5109.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0216-080f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0214-b5110.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0213-3411.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0212-e1db.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0211-aa71.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0210-fad8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0209-4aa1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0208-1c106.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0207-72a6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0206-b2be.jpg","http://api.service360.com.au/public/upload/files/IMG-20251008-WA0205-89a5.jpg"]	164	2
1014	Date	DATETIME	2025-10-09 23:19:43	2025 Oct 09 11:19 pm	167	0
1015	Is the Premises safe to enter?	YES_NO	2025-10-09 23:19:43	YES	167	1
1016	Photos – Cleaning Service Compliance	IMAGES	2025-10-09 23:19:43	[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]	167	2
1017	Date	DATETIME	2025-10-09 23:22:59	2025 Oct 09 11:22 pm	168	0
1018	Is the Premises safe to enter?	YES_NO	2025-10-09 23:22:59	YES	168	1
1019	Photos – Cleaning Service Compliance	IMAGES	2025-10-09 23:22:59	["http://api.service360.com.au/public/upload/files/IMG-20251009-WA0061-cf8b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0060-3393.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0059-aaef.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0058-421010.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0057-7794.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0056-d2ee.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0055-dce8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0054-5b43.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0053-e555.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0052-c006.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0051-d943.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0050-840e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0049-6697.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0048-9d3b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0047-99d8.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0046-9f5a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0045-10aa2.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0044-3676.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0043-119f.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0042-ae30.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0041-73fa.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0040-84ca.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0039-7f8a.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0038-1647.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0037-afca.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0036-8252.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0035-18710.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0034-fb46.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0033-faff.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0032-8354.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0031-f2d1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0030-89f1.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0029-5971.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0028-72dd.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0027-65109.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0026-8893.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0025-c109b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0024-7727.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0023-bcb9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0022-b10a10.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0021-bffb.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0020-c2b5.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0019-ee92.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0018-6c0e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0017-b198.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0016-fbbc.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0015-b579.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0014-1f50.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0013-054b.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0012-db44.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0011-7bd5.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0010-8ce9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0009-3562.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0008-d772.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0007-b588.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0006-7052.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0005-9a9e.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0004-ebd6.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0003-1db9.jpg","http://api.service360.com.au/public/upload/files/IMG-20251009-WA0002-77c9.jpg"]	168	3
1020	Date	DATETIME	2025-10-10 23:30:53	2025 Oct 10 11:30 pm	169	0
1021	Is the Premises safe to enter?	YES_NO	2025-10-10 23:30:53	YES	169	1
1022	Photos – Cleaning Service Compliance	IMAGES	2025-10-10 23:30:53	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372160_IMG-20251010-WA0185.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372230_IMG-20251010-WA0184.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372224_IMG-20251010-WA0183.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372217_IMG-20251010-WA0182.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372234_IMG-20251010-WA0181.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372232_IMG-20251010-WA0180.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372236_IMG-20251010-WA0176.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372327_IMG-20251010-WA0177.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372329_IMG-20251010-WA0178.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372322_IMG-20251010-WA0179.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372331_IMG-20251010-WA0175.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372335_IMG-20251010-WA0174.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372338_IMG-20251010-WA0173.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372378_IMG-20251010-WA0172.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372383_IMG-20251010-WA0168.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372386_IMG-20251010-WA0169.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372387_IMG-20251010-WA0170.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372390_IMG-20251010-WA0171.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372393_IMG-20251010-WA0167.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372421_IMG-20251010-WA0166.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372426_IMG-20251010-WA0165.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372428_IMG-20251010-WA0164.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372432_IMG-20251010-WA0160.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372439_IMG-20251010-WA0161.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372437_IMG-20251010-WA0162.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372452_IMG-20251010-WA0163.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372458_IMG-20251010-WA0159.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372464_IMG-20251010-WA0158.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372466_IMG-20251010-WA0157.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372470_IMG-20251010-WA0156.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372477_IMG-20251010-WA0152.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372541_IMG-20251010-WA0153.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372483_IMG-20251010-WA0154.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372550_IMG-20251010-WA0155.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372546_IMG-20251010-WA0151.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372558_IMG-20251010-WA0149.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372560_IMG-20251010-WA0148.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372591_IMG-20251010-WA0144.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372563_IMG-20251010-WA0145.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372582_IMG-20251010-WA0146.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372595_IMG-20251010-WA0147.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372589_IMG-20251010-WA0140.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099372593_IMG-20251010-WA0141.jpg"]	169	3
1023	Date	DATETIME	2025-10-10 23:40:56	2025 Oct 10 11:40 pm	170	0
1024	Is the Premises safe to enter?	YES_NO	2025-10-10 23:40:56	YES	170	1
1025	Photos – Cleaning Service Compliance	IMAGES	2025-10-10 23:40:56	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999741_IMG-20251010-WA0251.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999763_IMG-20251010-WA0198.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999747_IMG-20251010-WA0193.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999768_IMG-20251010-WA0187.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999774_IMG-20251010-WA0250.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999776_IMG-20251010-WA0249.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999778_IMG-20251010-WA0248.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999781_IMG-20251010-WA0247.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999808_IMG-20251010-WA0246.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999791_IMG-20251010-WA0245.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999785_IMG-20251010-WA0244.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999813_IMG-20251010-WA0243.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999817_IMG-20251010-WA0242.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999815_IMG-20251010-WA0241.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999819_IMG-20251010-WA0240.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999823_IMG-20251010-WA0239.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999834_IMG-20251010-WA0237.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999859_IMG-20251010-WA0236.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999871_IMG-20251010-WA0235.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999854_IMG-20251010-WA0234.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999881_IMG-20251010-WA0232.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999866_IMG-20251010-WA0238.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999886_IMG-20251010-WA0233.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999909_IMG-20251010-WA0231.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999902_IMG-20251010-WA0230.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999914_IMG-20251010-WA0229.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999921_IMG-20251010-WA0228.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999927_IMG-20251010-WA0227.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999924_IMG-20251010-WA0226.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760099999983_IMG-20251010-WA0225.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760100000011_IMG-20251010-WA0223.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760100000008_IMG-20251010-WA0222.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760100000019_IMG-20251010-WA0220.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760100000023_IMG-20251010-WA0218.jpg"]	170	2
1030	Date	DATETIME	2025-10-12 23:46:39	2025 Oct 12 11:46 pm	173	0
1031	Is the Premises safe to enter?	YES_NO	2025-10-12 23:46:39	YES	173	1
1032	Photos – Cleaning Service Compliance	IMAGES	2025-10-12 23:46:39	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273143971_IMG-20251012-WA0036.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273143952_IMG-20251012-WA0035.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273143943_IMG-20251012-WA0033.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273143979_IMG-20251012-WA0028.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273143977_IMG-20251012-WA0029.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273143980_IMG-20251012-WA0031.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273143985_IMG-20251012-WA0032.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273143983_IMG-20251012-WA0027.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273143992_IMG-20251012-WA0025.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144006_IMG-20251012-WA0024.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144011_IMG-20251012-WA0023.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144013_IMG-20251012-WA0022.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144014_IMG-20251012-WA0020.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144038_IMG-20251012-WA0018.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144024_IMG-20251012-WA0017.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144045_IMG-20251012-WA0016.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144043_IMG-20251012-WA0015.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144017_IMG-20251012-WA0014.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144019_IMG-20251012-WA0013.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144050_IMG-20251012-WA0012.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144053_IMG-20251012-WA0011.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144123_IMG-20251012-WA0010.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144056_IMG-20251012-WA0009.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144054_IMG-20251012-WA0008.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144126_IMG-20251012-WA0007.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144162_IMG-20251012-WA0006.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144176_IMG-20251012-WA0005.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144174_IMG-20251012-WA0004.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144178_IMG-20251012-WA0003.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144168_IMG-20251012-WA0002.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273144172_IMG-20251012-WA0001.jpg"]	173	3
1033	Date	DATETIME	2025-10-12 23:57:24	2025 Oct 12 11:57 pm	174	0
1034	Is the Premises safe to enter?	YES_NO	2025-10-12 23:57:24	YES	174	1
1035	Photos – Cleaning Service Compliance	IMAGES	2025-10-12 23:57:24	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273736965_IMG-20251012-WA0093.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273736963_IMG-20251012-WA0075.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273736977_IMG-20251012-WA0034.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273736967_IMG-20251012-WA0030.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273736972_IMG-20251012-WA0026.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273736970_IMG-20251012-WA0092.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273737222_IMG-20251012-WA0091.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273737224_IMG-20251012-WA0090.jpg",null,null,null,"https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273737232_IMG-20251012-WA0086.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760273737243_IMG-20251012-WA0084.jpg",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]	174	2
1040	Date	DATETIME	2025-10-13 22:35:30	2025 Oct 13 10:35 pm	177	0
1041	Is the Premises safe to enter?	YES_NO	2025-10-13 22:35:30	YES	177	1
1042	Photos – Cleaning Service Compliance	IMAGES	2025-10-13 22:35:30	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355147239_IMG-20251013-WA0007.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355147231_IMG-20251013-WA0008.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355147243_IMG-20251013-WA0009.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355147240_IMG-20251013-WA0010.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355147248_IMG-20251013-WA0011.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355147269_IMG-20251013-WA0012.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355147271_IMG-20251013-WA0013.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355147275_IMG-20251013-WA0015.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355147281_IMG-20251013-WA0016.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355147283_IMG-20251013-WA0017.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355147286_IMG-20251013-WA0018.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355147292_IMG-20251013-WA0019.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355147304_IMG-20251013-WA0020.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355147298_IMG-20251013-WA0021.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355287151_IMG-20251013-WA0015.jpg"]	177	3
1043	Date	DATETIME	2025-10-13 22:48:50	2025 Oct 13 10:48 pm	178	0
1044	Is the Premises safe to enter?	YES_NO	2025-10-13 22:48:50	YES	178	1
1045	Photos – Cleaning Service Compliance	IMAGES	2025-10-13 22:48:50	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355915934_IMG-20251013-WA0108.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355915972_IMG-20251013-WA0129.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355915966_IMG-20251013-WA0128.jpg",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355915942_IMG-20251013-WA0106.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355915959_IMG-20251013-WA0105.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355915964_IMG-20251013-WA0104.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355915975_IMG-20251013-WA0103.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355915970_IMG-20251013-WA0102.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355916000_IMG-20251013-WA0101.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355916017_IMG-20251013-WA0100.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355916023_IMG-20251013-WA0099.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355916042_IMG-20251013-WA0098.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355916037_IMG-20251013-WA0097.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355916040_IMG-20251013-WA0096.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355916044_IMG-20251013-WA0095.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355916082_IMG-20251013-WA0094.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355916092_IMG-20251013-WA0093.jpg",null,null,null,"https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760355916106_IMG-20251013-WA0088.jpg",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]	178	2
1052	Date	DATETIME	2025-10-14 23:20:24	2025 Oct 14 11:20 pm	182	0
1053	Is the Premises safe to enter?	YES_NO	2025-10-14 23:20:24	YES	182	1
1054	Photos – Cleaning Service Compliance	IMAGES	2025-10-14 23:20:24	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760444181240_IMG-20251014-WA0149.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760444181274_IMG-20251014-WA0146.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760444181246_IMG-20251014-WA0145.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760444409879_IMG-20251014-WA0087.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760444409896_IMG-20251014-WA0068.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760444409897_IMG-20251014-WA0041.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760444409890_IMG-20251014-WA0039.jpg"]	182	2
1057	Date	DATETIME	2025-10-16 07:55:24	2025 Oct 16 7:55 am	184	0
1058	Is the Premises safe to enter?	YES_NO	2025-10-16 07:55:24	YES	184	1
1059	Photos – Cleaning Service Compliance	IMAGES	2025-10-16 07:55:24	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561584636_IMG-20251015-WA0010.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561584638_IMG-20251015-WA0011.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561584633_IMG-20251015-WA0012.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561584641_IMG-20251015-WA0013.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561584646_IMG-20251015-WA0014.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561584664_IMG-20251015-WA0016.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561584668_IMG-20251015-WA0017.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561584674_IMG-20251015-WA0018.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561584679_IMG-20251015-WA0021.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561584688_IMG-20251015-WA0022.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561716328_IMG-20251015-WA0034.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760561716333_IMG-20251015-WA0030.jpg"]	184	2
1062	Date	DATETIME	2025-10-16 08:06:09	2025 Oct 16 8:06 am	186	0
1063	Is the Premises safe to enter?	YES_NO	2025-10-16 08:06:09	YES	186	1
1064	Photos – Cleaning Service Compliance	IMAGES	2025-10-16 08:06:09	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212395_IMG-20251015-WA0133.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212401_IMG-20251015-WA0132.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212404_IMG-20251015-WA0131.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212406_IMG-20251015-WA0130.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212407_IMG-20251015-WA0126.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212409_IMG-20251015-WA0127.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212417_IMG-20251015-WA0128.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212432_IMG-20251015-WA0129.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212433_IMG-20251015-WA0125.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212439_IMG-20251015-WA0124.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212435_IMG-20251015-WA0123.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212425_IMG-20251015-WA0122.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212444_IMG-20251015-WA0118.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212447_IMG-20251015-WA0119.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212459_IMG-20251015-WA0121.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212449_IMG-20251015-WA0117.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212454_IMG-20251015-WA0116.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212473_IMG-20251015-WA0114.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562212471_IMG-20251015-WA0113.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562341185_IMG-20251015-WA0133.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562341197_IMG-20251015-WA0132.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562341190_IMG-20251015-WA0131.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562341202_IMG-20251015-WA0130.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562341199_IMG-20251015-WA0126.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562341200_IMG-20251015-WA0127.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562341204_IMG-20251015-WA0128.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562341213_IMG-20251015-WA0129.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562341234_IMG-20251015-WA0125.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562341225_IMG-20251015-WA0119.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562341231_IMG-20251015-WA0120.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760562341233_IMG-20251015-WA0121.jpg"]	186	3
1067	Date	DATETIME	2025-10-17 08:02:04	2025 Oct 17 8:02 am	188	0
1068	Is the Premises safe to enter?	YES_NO	2025-10-17 08:02:04	YES	188	1
1069	Photos – Cleaning Service Compliance	IMAGES	2025-10-17 08:02:04	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278358_IMG-20251016-WA0117.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278363_IMG-20251016-WA0116.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278365_IMG-20251016-WA0115.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278356_IMG-20251016-WA0114.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278367_IMG-20251016-WA0113.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278369_IMG-20251016-WA0112.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278388_IMG-20251016-WA0111.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278393_IMG-20251016-WA0110.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278396_IMG-20251016-WA0108.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278395_IMG-20251016-WA0107.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278401_IMG-20251016-WA0106.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278399_IMG-20251016-WA0105.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278407_IMG-20251016-WA0104.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278420_IMG-20251016-WA0103.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278484_IMG-20251016-WA0102.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278495_IMG-20251016-WA0101.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278491_IMG-20251016-WA0100.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278490_IMG-20251016-WA0099.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278497_IMG-20251016-WA0098.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278493_IMG-20251016-WA0097.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278505_IMG-20251016-WA0096.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278525_IMG-20251016-WA0095.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278533_IMG-20251016-WA0094.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278531_IMG-20251016-WA0092.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278535_IMG-20251016-WA0091.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278538_IMG-20251016-WA0090.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278563_IMG-20251016-WA0089.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278569_IMG-20251016-WA0086.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278574_IMG-20251016-WA0085.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648278571_IMG-20251016-WA0083.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648432644_IMG-20251016-WA0096.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648432653_IMG-20251016-WA0097.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648432639_IMG-20251016-WA0099.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648432647_IMG-20251016-WA0100.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648517828_IMG-20251016-WA0108.jpg"]	188	3
1070	Date	DATETIME	2025-10-17 08:11:36	2025 Oct 17 8:11 am	189	0
1071	Is the Premises safe to enter?	YES_NO	2025-10-17 08:11:36	YES	189	1
1072	Photos – Cleaning Service Compliance	IMAGES	2025-10-17 08:11:36	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901788_IMG-20251016-WA0057.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901802_IMG-20251016-WA0036.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901799_IMG-20251016-WA0056.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901795_IMG-20251016-WA0055.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901801_IMG-20251016-WA0054.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901793_IMG-20251016-WA0053.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901809_IMG-20251016-WA0052.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901818_IMG-20251016-WA0051.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901837_IMG-20251016-WA0050.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901835_IMG-20251016-WA0049.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901833_IMG-20251016-WA0048.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901827_IMG-20251016-WA0047.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901841_IMG-20251016-WA0046.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901840_IMG-20251016-WA0045.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901846_IMG-20251016-WA0044.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901871_IMG-20251016-WA0043.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901874_IMG-20251016-WA0042.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901865_IMG-20251016-WA0041.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901876_IMG-20251016-WA0040.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901877_IMG-20251016-WA0039.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901872_IMG-20251016-WA0038.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901883_IMG-20251016-WA0037.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901905_IMG-20251016-WA0035.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901916_IMG-20251016-WA0033.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901911_IMG-20251016-WA0031.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760648901913_IMG-20251016-WA0030.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050350_IMG-20251016-WA0057.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050391_IMG-20251016-WA0036.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050372_IMG-20251016-WA0056.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050386_IMG-20251016-WA0055.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050393_IMG-20251016-WA0054.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050356_IMG-20251016-WA0053.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050388_IMG-20251016-WA0052.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050397_IMG-20251016-WA0051.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050422_IMG-20251016-WA0050.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050398_IMG-20251016-WA0049.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050432_IMG-20251016-WA0048.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050436_IMG-20251016-WA0047.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050431_IMG-20251016-WA0046.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050434_IMG-20251016-WA0045.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050428_IMG-20251016-WA0044.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050443_IMG-20251016-WA0043.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050476_IMG-20251016-WA0042.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050459_IMG-20251016-WA0041.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050454_IMG-20251016-WA0040.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760649050474_IMG-20251016-WA0039.jpg"]	189	2
1075	Date	DATETIME	2025-10-18 09:27:24	2025 Oct 18 9:27 am	191	0
1076	Is the Premises safe to enter?	YES_NO	2025-10-18 09:27:24	YES	191	1
1077	Photos – Cleaning Service Compliance	IMAGES	2025-10-18 09:27:24	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760739482965_IMG-20251017-WA0013.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760739482979_IMG-20251017-WA0014.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760739482968_IMG-20251017-WA0015.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760739482980_IMG-20251017-WA0016.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760739482974_IMG-20251017-WA0017.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760739482961_IMG-20251017-WA0018.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760739482988_IMG-20251017-WA0019.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760739482994_IMG-20251017-WA0020.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760739482996_IMG-20251017-WA0021.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760739483010_IMG-20251017-WA0011.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760739483002_IMG-20251017-WA0022.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760739483014_IMG-20251017-WA0024.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760739483023_IMG-20251017-WA0025.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760739483020_IMG-20251017-WA0012.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760739912852_IMG-20251017-WA0013.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760739912897_IMG-20251017-WA0015.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740032557_IMG-20251017-WA0054.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740032563_IMG-20251017-WA0050.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740032568_IMG-20251017-WA0051.jpg"]	191	3
1080	Date	DATETIME	2025-10-18 09:31:57	2025 Oct 18 9:31 am	193	0
1081	Is the Premises safe to enter?	YES_NO	2025-10-18 09:31:57	YES	193	1
1439	Blow roof and leaves	YES_NO	2026-05-21 14:16:53.992	YES	254	10
1440	Ensure downpipes are clear?	YES_NO	2026-05-21 14:16:53.992	NO	254	11
1082	Photos – Cleaning Service Compliance	IMAGES	2025-10-18 09:31:57	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740170371_IMG-20251017-WA0076.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740170391_IMG-20251017-WA0074.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740170383_IMG-20251017-WA0127.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740170393_IMG-20251017-WA0126.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740170389_IMG-20251017-WA0125.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740170397_IMG-20251017-WA0123.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740170402_IMG-20251017-WA0122.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740170415_IMG-20251017-WA0119.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740170411_IMG-20251017-WA0118.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740299396_IMG-20251017-WA0119.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740299401_IMG-20251017-WA0120.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740299403_IMG-20251017-WA0121.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740299407_IMG-20251017-WA0124.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740299415_IMG-20251017-WA0125.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740299418_IMG-20251017-WA0126.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740299413_IMG-20251017-WA0123.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760740299426_IMG-20251017-WA0127.jpg"]	193	2
1083	Date	DATETIME	2025-10-19 08:22:37	2025 Oct 19 8:22 am	194	0
1084	Is the Premises safe to enter?	YES_NO	2025-10-19 08:22:37	YES	194	1
1085	Photos – Cleaning Service Compliance	IMAGES	2025-10-19 08:22:37	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822422719_IMG-20251019-WA0054.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822422761_IMG-20251019-WA0053.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822422767_IMG-20251019-WA0052.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822422774_IMG-20251019-WA0051.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822422769_IMG-20251019-WA0050.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822422772_IMG-20251019-WA0049.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822422799_IMG-20251019-WA0048.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822422809_IMG-20251019-WA0047.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822422806_IMG-20251019-WA0046.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822422807_IMG-20251019-WA0045.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822422781_IMG-20251019-WA0044.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822422771_IMG-20251019-WA0043.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822422812_IMG-20251019-WA0042.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822422810_IMG-20251019-WA0041.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822422850_IMG-20251019-WA0040.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822422856_IMG-20251019-WA0037.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822538194_IMG-20251019-WA0043.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822538192_IMG-20251019-WA0044.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822538197_IMG-20251019-WA0048.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822538189_IMG-20251019-WA0047.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822538222_IMG-20251019-WA0046.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822538201_IMG-20251019-WA0045.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822538226_IMG-20251019-WA0054.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822538224_IMG-20251019-WA0050.jpg"]	194	3
1088	Date	DATETIME	2025-10-19 08:26:33	2025 Oct 19 8:26 am	196	0
1089	Is the Premises safe to enter?	YES_NO	2025-10-19 08:26:33	YES	196	1
1090	Photos – Cleaning Service Compliance	IMAGES	2025-10-19 08:26:33	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822646684_IMG-20251018-WA0017.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822646714_IMG-20251018-WA0018.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822646709_IMG-20251018-WA0019.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822646686_IMG-20251018-WA0020.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822646689_IMG-20251018-WA0021.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822646695_IMG-20251018-WA0022.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822646721_IMG-20251018-WA0023.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822646722_IMG-20251018-WA0026.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822764289_IMG-20251018-WA0017.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822764312_IMG-20251018-WA0018.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822764314_IMG-20251018-WA0019.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822764309_IMG-20251018-WA0020.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822764310_IMG-20251018-WA0021.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822764305_IMG-20251018-WA0022.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822764316_IMG-20251018-WA0023.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822764335_IMG-20251018-WA0024.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822764329_IMG-20251018-WA0025.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822764342_IMG-20251018-WA0026.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822764323_IMG-20251018-WA0027.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760822764340_IMG-20251018-WA0028.jpg"]	196	2
1091	Date	DATETIME	2025-10-20 08:29:07	2025 Oct 20 8:29 am	197	0
1092	Is the Premises safe to enter?	YES_NO	2025-10-20 08:29:07	YES	197	1
1093	Photos – Cleaning Service Compliance	IMAGES	2025-10-20 08:29:07	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909247927_IMG-20251020-WA0009.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909247924_IMG-20251020-WA0008.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909247930_IMG-20251020-WA0007.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909247932_IMG-20251020-WA0006.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909247943_IMG-20251020-WA0005.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909247937_IMG-20251020-WA0004.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909247951_IMG-20251020-WA0003.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909247958_IMG-20251020-WA0002.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909247968_IMG-20251019-WA0140.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909247970_IMG-20251019-WA0132.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909247975_IMG-20251019-WA0141.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909247980_IMG-20251019-WA0139.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909322459_IMG-20251020-WA0009.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909322477_IMG-20251020-WA0008.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909322483_IMG-20251020-WA0007.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909322495_IMG-20251020-WA0006.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909322493_IMG-20251020-WA0005.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909322491_IMG-20251020-WA0004.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909322489_IMG-20251020-WA0003.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909322497_IMG-20251020-WA0002.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909322501_IMG-20251020-WA0001.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909322532_IMG-20251020-WA0000.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909322522_IMG-20251019-WA0140.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909322528_IMG-20251019-WA0141.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909322530_IMG-20251019-WA0139.jpg"]	197	3
1094	Date	DATETIME	2025-10-20 08:32:08	2025 Oct 20 8:32 am	198	0
1095	Is the Premises safe to enter?	YES_NO	2025-10-20 08:32:08	YES	198	1
1121	Photos – Cleaning Service Compliance	IMAGES	2025-10-25 09:45:44	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729065_IMG-20251025-WA0057.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729055_IMG-20251025-WA0056.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729050_IMG-20251025-WA0055.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729030_IMG-20251025-WA0054.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729026_IMG-20251025-WA0053.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729042_IMG-20251025-WA0052.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729061_IMG-20251025-WA0051.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729063_IMG-20251025-WA0050.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729074_IMG-20251025-WA0049.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729067_IMG-20251025-WA0048.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729082_IMG-20251025-WA0047.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729087_IMG-20251025-WA0046.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729098_IMG-20251025-WA0045.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729104_IMG-20251025-WA0044.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729112_IMG-20251025-WA0043.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729105_IMG-20251025-WA0042.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729110_IMG-20251025-WA0041.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729121_IMG-20251025-WA0040.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729115_IMG-20251025-WA0039.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729136_IMG-20251025-WA0038.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729145_IMG-20251025-WA0037.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729153_IMG-20251025-WA0036.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729151_IMG-20251025-WA0035.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345729157_IMG-20251025-WA0034.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878137_IMG-20251025-WA0057.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878156_IMG-20251025-WA0056.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878144_IMG-20251025-WA0055.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878128_IMG-20251025-WA0054.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878160_IMG-20251025-WA0053.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878158_IMG-20251025-WA0052.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878165_IMG-20251025-WA0051.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878163_IMG-20251025-WA0050.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878168_IMG-20251025-WA0049.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878187_IMG-20251025-WA0048.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878196_IMG-20251025-WA0047.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878194_IMG-20251025-WA0046.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878192_IMG-20251025-WA0045.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878201_IMG-20251025-WA0044.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878199_IMG-20251025-WA0043.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878205_IMG-20251025-WA0042.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878233_IMG-20251025-WA0041.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878231_IMG-20251025-WA0040.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878229_IMG-20251025-WA0039.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878235_IMG-20251025-WA0038.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878237_IMG-20251025-WA0037.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878227_IMG-20251025-WA0036.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761345878258_IMG-20251025-WA0035.jpg"]	207	3
1096	Photos – Cleaning Service Compliance	IMAGES	2025-10-20 08:32:08	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909444384_IMG-20251019-WA0128.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909444428_IMG-20251019-WA0127.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909444426_IMG-20251019-WA0126.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909444417_IMG-20251019-WA0125.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909444408_IMG-20251019-WA0124.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909444422_IMG-20251019-WA0123.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909444424_IMG-20251019-WA0122.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909444484_IMG-20251019-WA0119.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909508539_IMG-20251019-WA0128.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909508543_IMG-20251019-WA0127.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909508541_IMG-20251019-WA0126.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909508545_IMG-20251019-WA0125.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909508546_IMG-20251019-WA0124.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909509243_IMG-20251019-WA0123.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909509239_IMG-20251019-WA0122.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909509241_IMG-20251019-WA0121.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909509245_IMG-20251019-WA0120.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760909509247_IMG-20251019-WA0119.jpg"]	198	2
1097	Date	DATETIME	2025-10-21 07:24:11	2025 Oct 21 7:24 am	199	0
1098	Is the Premises safe to enter?	YES_NO	2025-10-21 07:24:11	YES	199	1
1099	Photos – Cleaning Service Compliance	IMAGES	2025-10-21 07:24:11	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991712131_IMG-20251020-WA0158.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991712127_IMG-20251020-WA0157.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991712136_IMG-20251020-WA0156.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991712155_IMG-20251020-WA0155.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991712159_IMG-20251020-WA0154.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991712168_IMG-20251020-WA0153.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991712171_IMG-20251020-WA0152.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991712169_IMG-20251020-WA0151.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991712166_IMG-20251020-WA0150.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991712173_IMG-20251020-WA0149.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991712198_IMG-20251020-WA0147.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991712204_IMG-20251020-WA0142.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991812197_IMG-20251020-WA0158.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991812183_IMG-20251020-WA0157.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991812181_IMG-20251020-WA0156.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991812193_IMG-20251020-WA0155.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991812189_IMG-20251020-WA0154.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991812187_IMG-20251020-WA0153.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991812202_IMG-20251020-WA0152.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991812227_IMG-20251020-WA0151.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991812221_IMG-20251020-WA0150.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991812217_IMG-20251020-WA0149.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991812215_IMG-20251020-WA0148.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991812209_IMG-20251020-WA0147.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991812229_IMG-20251020-WA0146.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760991812233_IMG-20251020-WA0145.jpg"]	199	3
1100	Date	DATETIME	2025-10-21 07:30:15	2025 Oct 21 7:30 am	200	0
1101	Is the Premises safe to enter?	YES_NO	2025-10-21 07:30:15	YES	200	1
1441	Overhanging tree brances?	YES_NO	2026-05-21 14:16:53.992	YES	254	12
1102	Photos – Cleaning Service Compliance	IMAGES	2025-10-21 07:30:15	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760992022943_IMG-20251020-WA0093.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760992022974_IMG-20251020-WA0092.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760992022979_IMG-20251020-WA0101.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760992022947_IMG-20251020-WA0070.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760992022941_IMG-20251020-WA0100.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760992022948_IMG-20251020-WA0099.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760992022981_IMG-20251020-WA0098.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760992022983_IMG-20251020-WA0097.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760992181313_IMG-20251020-WA0094.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760992181318_IMG-20251020-WA0095.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760992180909_IMG-20251020-WA0096.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760992180907_IMG-20251020-WA0097.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760992181307_IMG-20251020-WA0098.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760992181317_IMG-20251020-WA0099.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760992181380_IMG-20251020-WA0100.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1760992181315_IMG-20251020-WA0101.jpg"]	200	2
1103	Date	DATETIME	2025-10-22 09:04:32	2025 Oct 22 9:04 am	201	0
1104	Is the Premises safe to enter?	YES_NO	2025-10-22 09:04:32	YES	201	1
1105	Photos – Cleaning Service Compliance	IMAGES	2025-10-22 09:04:32	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030682_IMG-20251021-WA0085.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030693_IMG-20251021-WA0086.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030714_IMG-20251021-WA0087.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030719_IMG-20251021-WA0088.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030703_IMG-20251021-WA0089.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030688_IMG-20251021-WA0090.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030721_IMG-20251021-WA0092.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030742_IMG-20251021-WA0093.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030725_IMG-20251021-WA0094.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030727_IMG-20251021-WA0095.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030730_IMG-20251021-WA0096.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030736_IMG-20251021-WA0097.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030745_IMG-20251021-WA0098.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030748_IMG-20251021-WA0114.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030755_IMG-20251021-WA0115.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030754_IMG-20251021-WA0116.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030767_IMG-20251021-WA0120.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030759_IMG-20251021-WA0119.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084030772_IMG-20251021-WA0118.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084234176_IMG-20251021-WA0121.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084234188_IMG-20251021-WA0117.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084234200_IMG-20251021-WA0118.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084234195_IMG-20251021-WA0119.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084234208_IMG-20251021-WA0115.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084234207_IMG-20251021-WA0114.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084234210_IMG-20251021-WA0098.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084234213_IMG-20251021-WA0097.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084234221_IMG-20251021-WA0096.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084234236_IMG-20251021-WA0095.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084234219_IMG-20251021-WA0094.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084234242_IMG-20251021-WA0093.jpg"]	201	3
1106	Date	DATETIME	2025-10-22 09:11:14	2025 Oct 22 9:11 am	202	0
1107	Is the Premises safe to enter?	YES_NO	2025-10-22 09:11:14	YES	202	1
1108	Photos – Cleaning Service Compliance	IMAGES	2025-10-22 09:11:14	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084494140_IMG-20251022-WA0058.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084494134_IMG-20251022-WA0057.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084494148_IMG-20251022-WA0056.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084494136_IMG-20251022-WA0055.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084494139_IMG-20251022-WA0054.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084494142_IMG-20251022-WA0053.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084640036_IMG-20251022-WA0055.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084640121_IMG-20251022-WA0056.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084640119_IMG-20251022-WA0057.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084640041_IMG-20251022-WA0058.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084640115_IMG-20251022-WA0054.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084640111_IMG-20251022-WA0046.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084640117_IMG-20251022-WA0050.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084640122_IMG-20251022-WA0044.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084640132_IMG-20251022-WA0048.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084640152_IMG-20251022-WA0043.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084640158_IMG-20251022-WA0040.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084640154_IMG-20251022-WA0041.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084640156_IMG-20251022-WA0042.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761084640150_IMG-20251022-WA0039.jpg"]	202	2
1111	Date	DATETIME	2025-10-24 09:09:31	2025 Oct 24 9:09 am	204	0
1112	Is the Premises safe to enter?	YES_NO	2025-10-24 09:09:31	YES	204	1
1113	Photos – Cleaning Service Compliance	IMAGES	2025-10-24 09:09:31	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000589_IMG-20251024-WA0094.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000594_IMG-20251024-WA0093.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000597_IMG-20251024-WA0092.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000602_IMG-20251024-WA0091.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000600_IMG-20251024-WA0090.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000605_IMG-20251024-WA0089.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000642_IMG-20251024-WA0088.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000630_IMG-20251024-WA0087.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000638_IMG-20251024-WA0086.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000636_IMG-20251024-WA0085.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000625_IMG-20251024-WA0084.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000640_IMG-20251024-WA0083.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000645_IMG-20251024-WA0082.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000650_IMG-20251024-WA0081.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000668_IMG-20251024-WA0080.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000658_IMG-20251024-WA0079.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000674_IMG-20251024-WA0077.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000676_IMG-20251024-WA0076.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257000681_IMG-20251024-WA0075.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257305967_IMG-20251022-WA0109.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257305931_IMG-20251022-WA0110.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257305955_IMG-20251022-WA0106.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257305969_IMG-20251022-WA0105.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257305961_IMG-20251022-WA0101.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257305937_IMG-20251022-WA0097.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257305972_IMG-20251022-WA0094.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257305974_IMG-20251022-WA0095.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257305987_IMG-20251022-WA0089.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257305993_IMG-20251022-WA0090.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257305989_IMG-20251022-WA0088.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257305995_IMG-20251022-WA0084.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257306001_IMG-20251022-WA0085.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257305999_IMG-20251022-WA0086.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257306008_IMG-20251022-WA0087.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257306021_IMG-20251022-WA0081.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257306013_IMG-20251022-WA0082.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257306015_IMG-20251022-WA0080.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257306019_IMG-20251022-WA0083.jpg"]	204	3
1116	Date	DATETIME	2025-10-24 09:17:37	2025 Oct 24 9:17 am	206	0
1117	Is the Premises safe to enter?	YES_NO	2025-10-24 09:17:37	YES	206	1
1118	Photos – Cleaning Service Compliance	IMAGES	2025-10-24 09:17:37	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257519063_IMG-20251024-WA0024.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257519106_IMG-20251022-WA0123.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257519108_IMG-20251022-WA0122.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257519133_IMG-20251022-WA0121.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257519141_IMG-20251022-WA0120.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257519143_IMG-20251022-WA0119.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257821206_IMG-20251022-WA0149.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257821200_IMG-20251022-WA0155.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257821210_IMG-20251022-WA0137.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257821203_IMG-20251022-WA0135.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761257821219_IMG-20251022-WA0136.jpg"]	206	2
1133	Date	DATETIME	2025-10-27 22:27:07	2025 Oct 27 10:27 pm	212	0
1134	Is the Premises safe to enter?	YES_NO	2025-10-27 22:27:07	YES	212	1
1135	Photos – Cleaning Service Compliance	IMAGES	2025-10-27 22:27:07	["https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564297726_IMG-20251026-WA0097.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564297809_IMG-20251026-WA0098.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564297814_IMG-20251026-WA0099.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564297720_IMG-20251026-WA0100.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564297724_IMG-20251026-WA0101.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564298429_IMG-20251026-WA0104.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564298433_IMG-20251026-WA0105.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564298844_IMG-20251026-WA0106.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564298841_IMG-20251026-WA0107.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564298437_IMG-20251026-WA0108.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564298435_IMG-20251026-WA0102.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564298942_IMG-20251026-WA0103.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564298955_IMG-20251026-WA0111.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564298952_IMG-20251026-WA0113.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564299236_IMG-20251026-WA0116.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564299352_IMG-20251026-WA0110.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564391425_IMG-20251026-WA0105.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564391911_IMG-20251026-WA0106.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564391418_IMG-20251026-WA0107.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564391807_IMG-20251026-WA0108.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564391918_IMG-20251026-WA0104.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564391922_IMG-20251026-WA0101.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564391913_IMG-20251026-WA0100.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564391916_IMG-20251026-WA0099.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564391920_IMG-20251026-WA0098.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/1761564392030_IMG-20251026-WA0097.jpg"]	212	3
1442	Before photos	IMAGES	2026-05-21 14:16:53.993	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779336147339-WhatsApp_Image_2025-05-26_at_11.29.50_4cfb54dd.jpg"]	254	13
1443	After photos	IMAGES	2026-05-21 14:16:53.993	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779336147787-WhatsApp_Image_2025-05-26_at_11.29.50_622b4b53.jpg"]	254	14
1444	Is the Premises safe to enter?	YES_NO	2026-05-21 14:26:47.793	YES	255	2
1445	Photos – Cleaning Service Compliance	IMAGES	2026-05-21 14:26:47.793	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337605652-WhatsApp_Image_2025-05-26_at_11.29.50_3ccc7c30.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337605694-WhatsApp_Image_2025-05-26_at_11.29.50_4cfb54dd.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337605743-WhatsApp_Image_2025-05-26_at_11.29.50_4f6203b4.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337605784-WhatsApp_Image_2025-05-26_at_11.29.50_4fccfbbc.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337606027-WhatsApp_Image_2025-05-26_at_11.29.50_6a92d8ff.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337606112-WhatsApp_Image_2025-05-26_at_11.29.50_6a255cf0.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337606211-WhatsApp_Image_2025-05-26_at_11.29.50_9a75a35c.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337606298-WhatsApp_Image_2025-05-26_at_11.29.50_9ec45c1e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337606405-WhatsApp_Image_2025-05-26_at_11.29.50_75d0a6e2.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337606522-WhatsApp_Image_2025-05-26_at_11.29.50_316e22fc.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337606629-WhatsApp_Image_2025-05-26_at_11.29.50_543a7c34.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337606735-WhatsApp_Image_2025-05-26_at_11.29.50_622b4b53.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337606844-WhatsApp_Image_2025-05-26_at_11.29.50_536476a9.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337606951-WhatsApp_Image_2025-05-26_at_11.29.50_943157db.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337607061-WhatsApp_Image_2025-05-26_at_11.29.50_2299312d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337607196-WhatsApp_Image_2025-05-26_at_11.29.50_14319603.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337607295-WhatsApp_Image_2025-05-26_at_11.29.50_a5eb888e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779337607384-WhatsApp_Image_2025-05-26_at_11.29.50_aa159dde.jpg"]	255	3
1432	Date:	TEXT	2026-05-21 14:16:53.989	111111	254	1
1433	Is the premises safe to enter?	YES_NO	2026-05-21 14:16:53.989	YES	254	4
1434	Are all staff attending site wearing appropriate PPE & Uniform ?	YES_NO	2026-05-21 14:16:53.99	NO	254	5
1435	Have you introduced yourself to the staff onsite and advised you are commencing work?	YES_NO	2026-05-21 14:16:53.99	YES	254	6
1436	IS Condition of the roof and gutters good?	YES_NO	2026-05-21 14:16:53.991	NO	254	7
1384	Photos – Cleaning Service Compliance__part6	IMAGES	2026-05-21 12:14:57.419	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329693182-WhatsApp_Image_2025-09-10_at_11.15.39_a83fd9ab.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329693377-WhatsApp_Image_2025-09-10_at_11.15.40_0bd70fed.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329693589-WhatsApp_Image_2025-09-10_at_11.15.40_b8afde66.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329693781-WhatsApp_Image_2025-09-10_at_11.15.40_f1311cb8.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329693978-WhatsApp_Image_2025-09-10_at_11.15.41_851d42ad.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329694180-WhatsApp_Image_2025-09-10_at_11.15.41_7167826e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329694404-WhatsApp_Image_2025-09-10_at_11.15.41_c0784340.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329694575-WhatsApp_Image_2025-09-10_at_11.15.42_8ebdf22b.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329694789-WhatsApp_Image_2025-09-10_at_11.15.42_283d8351.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329694986-WhatsApp_Image_2025-09-10_at_11.15.42_2037feb4.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329695170-WhatsApp_Image_2025-09-10_at_11.15.43_06bc159a.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329695366-WhatsApp_Image_2025-09-10_at_11.15.43_ce7edb0f.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329695564-WhatsApp_Image_2025-09-10_at_11.15.43_f898d074.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329695758-WhatsApp_Image_2025-09-10_at_11.15.44_093c8aae.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329695951-WhatsApp_Image_2025-09-10_at_11.15.44_9656a5a7.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329696149-WhatsApp_Image_2025-09-10_at_11.15.44_a6f43616.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329696353-WhatsApp_Image_2025-09-10_at_11.15.44_b1029710.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329696551-work.56bf9122.jpg"]	246	3
1378	Is the Premises safe to enter?	YES_NO	2026-05-21 12:14:57.419	YES	246	2
1379	Photos – Cleaning Service Compliance	IMAGES	2026-05-21 12:14:57.419	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329661663-WhatsApp_Image_2025-05-26_at_11.29.43_3eba05a0.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329661739-WhatsApp_Image_2025-05-26_at_11.29.44_56a93760.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329661827-WhatsApp_Image_2025-05-26_at_11.29.48_15e9727f.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329661908-WhatsApp_Image_2025-05-26_at_11.29.49_4bfddf2d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329662222-WhatsApp_Image_2025-05-26_at_11.29.49_8fbfd288.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329662432-WhatsApp_Image_2025-05-26_at_11.29.49_d5ec9652.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329662593-WhatsApp_Image_2025-05-26_at_11.29.50_3ccc7c30.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329662762-WhatsApp_Image_2025-05-26_at_11.29.50_4cfb54dd.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329662964-WhatsApp_Image_2025-05-26_at_11.29.50_4f6203b4.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329663172-WhatsApp_Image_2025-05-26_at_11.29.50_4fccfbbc.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329663400-WhatsApp_Image_2025-05-26_at_11.29.50_6a92d8ff.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329663580-WhatsApp_Image_2025-05-26_at_11.29.50_6a255cf0.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329663788-WhatsApp_Image_2025-05-26_at_11.29.50_9a75a35c.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329663999-WhatsApp_Image_2025-05-26_at_11.29.50_9ec45c1e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329664205-WhatsApp_Image_2025-05-26_at_11.29.50_75d0a6e2.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329664404-WhatsApp_Image_2025-05-26_at_11.29.50_316e22fc.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329664613-WhatsApp_Image_2025-05-26_at_11.29.50_543a7c34.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329664833-WhatsApp_Image_2025-05-26_at_11.29.50_622b4b53.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329665016-WhatsApp_Image_2025-05-26_at_11.29.50_536476a9.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329665222-WhatsApp_Image_2025-05-26_at_11.29.50_943157db.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329665418-WhatsApp_Image_2025-05-26_at_11.29.50_2299312d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329665617-WhatsApp_Image_2025-05-26_at_11.29.50_14319603.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329665817-WhatsApp_Image_2025-05-26_at_11.29.50_a5eb888e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329666019-WhatsApp_Image_2025-05-26_at_11.29.50_aa159dde.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329666217-WhatsApp_Image_2025-05-26_at_11.29.50_abc089f8.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329666416-WhatsApp_Image_2025-05-26_at_11.29.50_af8c01ea.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329666637-WhatsApp_Image_2025-05-26_at_11.29.50_afb5820d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329666823-WhatsApp_Image_2025-05-26_at_11.29.50_b8f4411c.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329667011-WhatsApp_Image_2025-05-26_at_11.29.50_bb30c3e5.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329667218-WhatsApp_Image_2025-05-26_at_11.29.50_c518d788.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329667422-WhatsApp_Image_2025-05-26_at_11.29.50_d58e9fca.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329667615-WhatsApp_Image_2025-05-26_at_11.29.50_e2c09a7f.jpg"]	246	3
1380	Photos – Cleaning Service Compliance__part2	IMAGES	2026-05-21 12:14:57.419	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329667822-WhatsApp_Image_2025-05-26_at_11.29.50_e5ca838c.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329668030-WhatsApp_Image_2025-05-26_at_11.29.50_e33e1625.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329668213-WhatsApp_Image_2025-05-26_at_11.29.50_e53c8069.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329668422-WhatsApp_Image_2025-05-26_at_11.29.50_e088e562.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329668606-WhatsApp_Image_2025-05-26_at_11.29.50_ff0d82cc.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329668806-WhatsApp_Image_2025-05-26_at_11.29.51_1d96217a.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329669004-WhatsApp_Image_2025-05-26_at_11.29.51_1e0e879e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329669202-WhatsApp_Image_2025-05-26_at_11.29.51_2b256ab3.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329670003-WhatsApp_Image_2025-05-26_at_11.29.51_2bc07e15.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329669537-WhatsApp_Image_2025-05-26_at_11.29.51_3c396628.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329669723-WhatsApp_Image_2025-05-26_at_11.29.51_5a749e30.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329669920-WhatsApp_Image_2025-05-26_at_11.29.51_9d8d424b.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329670206-WhatsApp_Image_2025-05-26_at_11.29.51_38cfa9be.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329670422-WhatsApp_Image_2025-05-26_at_11.29.51_71c1ad0d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329670596-WhatsApp_Image_2025-05-26_at_11.29.51_74b49e16.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329670832-WhatsApp_Image_2025-05-26_at_11.29.51_97a5af01.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329670990-WhatsApp_Image_2025-05-26_at_11.29.51_716d6ca9.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329671205-WhatsApp_Image_2025-05-26_at_11.29.51_38835a1d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329671397-WhatsApp_Image_2025-05-26_at_11.29.51_a3a1b880.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329671583-WhatsApp_Image_2025-05-26_at_11.29.51_a4f15611.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329671779-WhatsApp_Image_2025-05-26_at_11.29.51_a4065bea.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329671977-WhatsApp_Image_2025-05-26_at_11.29.51_b6e5290f.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329672173-WhatsApp_Image_2025-05-26_at_11.29.51_bfdff8fb.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329672389-WhatsApp_Image_2025-05-26_at_11.29.51_c48e67a2.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329672579-WhatsApp_Image_2025-05-26_at_11.29.51_cb734361.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329672778-WhatsApp_Image_2025-05-26_at_11.29.51_dc6695ee.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329672975-WhatsApp_Image_2025-05-26_at_11.29.51_f4129703.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329673174-WhatsApp_Image_2025-05-26_at_11.29.52_2ad8402d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329673372-WhatsApp_Image_2025-05-26_at_11.29.52_2f202e21.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329673571-WhatsApp_Image_2025-05-26_at_11.29.52_25b93d13.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329673772-WhatsApp_Image_2025-05-26_at_11.29.52_42d07beb.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329673961-WhatsApp_Image_2025-05-26_at_11.29.52_67d235ce.jpg"]	246	3
1381	Photos – Cleaning Service Compliance__part3	IMAGES	2026-05-21 12:14:57.419	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329674159-WhatsApp_Image_2025-05-26_at_11.29.52_49202a0a.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329674355-WhatsApp_Image_2025-05-26_at_11.29.52_cb187874.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329674556-WhatsApp_Image_2025-05-26_at_11.29.52_cf1d8cbd.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329674751-WhatsApp_Image_2025-09-10_at_11.10.09_47ea87e8.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329674956-WhatsApp_Image_2025-09-10_at_11.10.09_d4b1903d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329675172-WhatsApp_Image_2025-09-10_at_11.10.09_d570180e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329675354-WhatsApp_Image_2025-09-10_at_11.10.10_694d80a0.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329675554-WhatsApp_Image_2025-09-10_at_11.10.10_68437928.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329675751-WhatsApp_Image_2025-09-10_at_11.10.12_18ce9b2e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329675948-WhatsApp_Image_2025-09-10_at_11.10.13_39e542b7.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329676151-WhatsApp_Image_2025-09-10_at_11.10.13_cc197224.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329676342-WhatsApp_Image_2025-09-10_at_11.10.14_2a5528ee.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329676539-WhatsApp_Image_2025-09-10_at_11.10.14_4b7f2773.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329676734-WhatsApp_Image_2025-09-10_at_11.10.14_8121feeb.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329676930-WhatsApp_Image_2025-09-10_at_11.10.14_ada6ec55.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329677129-WhatsApp_Image_2025-09-10_at_11.10.15_9218f8f8.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329677326-WhatsApp_Image_2025-09-10_at_11.10.15_993305a4.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329677523-WhatsApp_Image_2025-09-10_at_11.10.16_d4c14c38.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329677730-WhatsApp_Image_2025-09-10_at_11.10.17_a4b8e3d1.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329677930-WhatsApp_Image_2025-09-10_at_11.10.18_4a436dd7.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329678139-WhatsApp_Image_2025-09-10_at_11.10.18_fd9a979b.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329678327-WhatsApp_Image_2025-09-10_at_11.10.19_01f7f7bb.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329678527-WhatsApp_Image_2025-09-10_at_11.10.19_1f686f74.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329678722-WhatsApp_Image_2025-09-10_at_11.10.19_03f3d70c.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329678935-WhatsApp_Image_2025-09-10_at_11.10.20_4f592c81.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329679117-WhatsApp_Image_2025-09-10_at_11.10.20_95b59b65.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329679315-WhatsApp_Image_2025-09-10_at_11.10.20_9634cda6.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329679510-WhatsApp_Image_2025-09-10_at_11.10.21_3db69299.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329679711-WhatsApp_Image_2025-09-10_at_11.10.21_4aa80bc1.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329679906-WhatsApp_Image_2025-09-10_at_11.10.21_0875ece2.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329680100-WhatsApp_Image_2025-09-10_at_11.10.22_07b16b2a.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329680323-WhatsApp_Image_2025-09-10_at_11.12.56_7f717be6.jpg"]	246	3
1382	Photos – Cleaning Service Compliance__part4	IMAGES	2026-05-21 12:14:57.419	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329680504-WhatsApp_Image_2025-09-10_at_11.12.58_d36ebe53.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329680722-WhatsApp_Image_2025-09-10_at_11.12.59_b30489f1.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329680921-WhatsApp_Image_2025-09-10_at_11.12.59_cb9d227d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329681133-WhatsApp_Image_2025-09-10_at_11.13.01_9b39d5df.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329681304-WhatsApp_Image_2025-09-10_at_11.13.01_ee63ef2d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329681496-WhatsApp_Image_2025-09-10_at_11.13.02_02e67ade.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329681696-WhatsApp_Image_2025-09-10_at_11.13.02_db63fe82.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329681909-WhatsApp_Image_2025-09-10_at_11.13.02_fadb0159.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329682089-WhatsApp_Image_2025-09-10_at_11.13.03_029f27e2.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329682284-WhatsApp_Image_2025-09-10_at_11.13.03_c877637f.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329682481-WhatsApp_Image_2025-09-10_at_11.13.03_d1db40c2.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329682681-WhatsApp_Image_2025-09-10_at_11.13.04_1c5e292c.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329682885-WhatsApp_Image_2025-09-10_at_11.13.04_5f10660e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329683082-WhatsApp_Image_2025-09-10_at_11.13.04_fa030536.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329683282-WhatsApp_Image_2025-09-10_at_11.13.05_4c36482c.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329683480-WhatsApp_Image_2025-09-10_at_11.13.05_7133bf3b.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329683676-WhatsApp_Image_2025-09-10_at_11.13.05_ecc83c4e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329683877-WhatsApp_Image_2025-09-10_at_11.13.06_3dbef323.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329684089-WhatsApp_Image_2025-09-10_at_11.13.06_37b31535.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329684286-WhatsApp_Image_2025-09-10_at_11.13.06_78734383.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329684466-WhatsApp_Image_2025-09-10_at_11.13.06_d9e0ba59.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329684738-WhatsApp_Image_2025-09-10_at_11.13.07_2f03545f.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329684859-WhatsApp_Image_2025-09-10_at_11.13.07_6a1eb8d2.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329685057-WhatsApp_Image_2025-09-10_at_11.13.07_26fb0d08.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329685255-WhatsApp_Image_2025-09-10_at_11.13.08_3b7dafc6.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329685462-WhatsApp_Image_2025-09-10_at_11.13.08_d565e9a7.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329685661-WhatsApp_Image_2025-09-10_at_11.13.08_f576737e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329685857-WhatsApp_Image_2025-09-10_at_11.13.09_48f79d65.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329686054-WhatsApp_Image_2025-09-10_at_11.15.16_30e85e76.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329686249-WhatsApp_Image_2025-09-10_at_11.15.16_5897a713.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329686455-WhatsApp_Image_2025-09-10_at_11.15.16_b8ed4b8f.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329686656-WhatsApp_Image_2025-09-10_at_11.15.16_f94d04fb.jpg"]	246	3
1383	Photos – Cleaning Service Compliance__part5	IMAGES	2026-05-21 12:14:57.419	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329686856-WhatsApp_Image_2025-09-10_at_11.15.19_5df31d42.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329687056-WhatsApp_Image_2025-09-10_at_11.15.20_6adda077.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329687236-WhatsApp_Image_2025-09-10_at_11.15.26_7b5434e4.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329687438-WhatsApp_Image_2025-09-10_at_11.15.26_5162cd21.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329687639-WhatsApp_Image_2025-09-10_at_11.15.27_da90582f.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329687839-WhatsApp_Image_2025-09-10_at_11.15.31_0aa12f97.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329688035-WhatsApp_Image_2025-09-10_at_11.15.31_38d89f06.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329688239-WhatsApp_Image_2025-09-10_at_11.15.31_e4a53cfc.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329688438-WhatsApp_Image_2025-09-10_at_11.15.32_03f20997.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329688636-WhatsApp_Image_2025-09-10_at_11.15.32_21ac3f5a.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329688839-WhatsApp_Image_2025-09-10_at_11.15.32_a80ff110.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329689031-WhatsApp_Image_2025-09-10_at_11.15.33_7a40f666.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329689239-WhatsApp_Image_2025-09-10_at_11.15.33_1706d34e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329689426-WhatsApp_Image_2025-09-10_at_11.15.33_aeaa0c97.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329689620-WhatsApp_Image_2025-09-10_at_11.15.34_c975740d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329689821-WhatsApp_Image_2025-09-10_at_11.15.34_d9cbc8f8.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329690018-WhatsApp_Image_2025-09-10_at_11.15.34_f5ba43f6.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329690217-WhatsApp_Image_2025-09-10_at_11.15.35_8d788d43.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329690412-WhatsApp_Image_2025-09-10_at_11.15.35_537c2b60.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329690610-WhatsApp_Image_2025-09-10_at_11.15.35_ff8e09c3.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329690823-WhatsApp_Image_2025-09-10_at_11.15.36_21bd8329.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329691013-WhatsApp_Image_2025-09-10_at_11.15.36_489875cb.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329691208-WhatsApp_Image_2025-09-10_at_11.15.36_a4bea57d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329691410-WhatsApp_Image_2025-09-10_at_11.15.36_bd34ce85.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329691606-WhatsApp_Image_2025-09-10_at_11.15.37_07208c21.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329691823-WhatsApp_Image_2025-09-10_at_11.15.37_c19d61dd.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329692001-WhatsApp_Image_2025-09-10_at_11.15.37_c75fca60.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329692222-WhatsApp_Image_2025-09-10_at_11.15.38_5c0554ef.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329692395-WhatsApp_Image_2025-09-10_at_11.15.38_78275b7b.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329692591-WhatsApp_Image_2025-09-10_at_11.15.38_e3fde84e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329692790-WhatsApp_Image_2025-09-10_at_11.15.39_239b9a61.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-21/1779329693004-WhatsApp_Image_2025-09-10_at_11.15.39_a2acf032.jpg"]	246	3
1446	Before photos	IMAGES	2026-05-22 11:54:26.098	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414861744-WhatsApp_Image_2025-05-26_at_11.29.43_3eba05a0.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414861780-WhatsApp_Image_2025-05-26_at_11.29.44_56a93760.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414861821-WhatsApp_Image_2025-05-26_at_11.29.48_15e9727f.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414861863-WhatsApp_Image_2025-05-26_at_11.29.49_4bfddf2d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414862142-WhatsApp_Image_2025-05-26_at_11.29.49_8fbfd288.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414862223-WhatsApp_Image_2025-05-26_at_11.29.49_d5ec9652.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414862305-WhatsApp_Image_2025-05-26_at_11.29.50_3ccc7c30.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414862383-WhatsApp_Image_2025-05-26_at_11.29.50_4cfb54dd.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414862529-WhatsApp_Image_2025-05-26_at_11.29.50_4f6203b4.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414862624-WhatsApp_Image_2025-05-26_at_11.29.50_4fccfbbc.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414862700-WhatsApp_Image_2025-05-26_at_11.29.50_6a92d8ff.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414862795-WhatsApp_Image_2025-05-26_at_11.29.50_6a255cf0.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414862907-WhatsApp_Image_2025-05-26_at_11.29.50_9a75a35c.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414863078-WhatsApp_Image_2025-05-26_at_11.29.50_9ec45c1e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414863169-WhatsApp_Image_2025-05-26_at_11.29.50_75d0a6e2.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414863253-WhatsApp_Image_2025-05-26_at_11.29.50_316e22fc.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414863344-WhatsApp_Image_2025-05-26_at_11.29.50_543a7c34.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414863436-WhatsApp_Image_2025-05-26_at_11.29.50_622b4b53.jpg"]	256	1
1447	After photos	IMAGES	2026-05-22 11:54:26.098	["https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414863846-WhatsApp_Image_2025-05-26_at_11.29.43_3eba05a0.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414863884-WhatsApp_Image_2025-05-26_at_11.29.44_56a93760.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414863925-WhatsApp_Image_2025-05-26_at_11.29.48_15e9727f.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414863964-WhatsApp_Image_2025-05-26_at_11.29.49_4bfddf2d.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414864231-WhatsApp_Image_2025-05-26_at_11.29.49_8fbfd288.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414864316-WhatsApp_Image_2025-05-26_at_11.29.49_d5ec9652.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414864475-WhatsApp_Image_2025-05-26_at_11.29.50_3ccc7c30.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414864544-WhatsApp_Image_2025-05-26_at_11.29.50_4cfb54dd.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414864632-WhatsApp_Image_2025-05-26_at_11.29.50_4f6203b4.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414864720-WhatsApp_Image_2025-05-26_at_11.29.50_4fccfbbc.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414864806-WhatsApp_Image_2025-05-26_at_11.29.50_6a92d8ff.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414865139-WhatsApp_Image_2025-05-26_at_11.29.50_6a255cf0.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414865210-WhatsApp_Image_2025-05-26_at_11.29.50_9a75a35c.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414865284-WhatsApp_Image_2025-05-26_at_11.29.50_9ec45c1e.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414865407-WhatsApp_Image_2025-05-26_at_11.29.50_75d0a6e2.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414865513-WhatsApp_Image_2025-05-26_at_11.29.50_316e22fc.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414865587-WhatsApp_Image_2025-05-26_at_11.29.50_543a7c34.jpg","https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-05-22/1779414865677-WhatsApp_Image_2025-05-26_at_11.29.50_622b4b53.jpg"]	256	2
1448	Overhanging tree brances?	YES_NO	2026-05-22 11:54:26.098	NO	256	3
1449	Clear gutters of debris?	YES_NO	2026-05-22 11:54:26.098	YES	256	5
1450	Blow roof and leaves	YES_NO	2026-05-22 11:54:26.098	YES	256	8
1451	IS Condition of the roof and gutters good?	YES_NO	2026-05-22 11:54:26.098	YES	256	10
1452	Have you introduced yourself to the staff onsite and advised you are commencing work?	YES_NO	2026-05-22 11:54:26.098	YES	256	11
1453	Are all staff attending site wearing appropriate PPE & Uniform ?	YES_NO	2026-05-22 11:54:26.098	YES	256	12
1454	Is the premises safe to enter?	YES_NO	2026-05-22 11:54:26.098	YES	256	13
\.


--
-- TOC entry 5451 (class 0 OID 17227)
-- Dependencies: 261
-- Data for Name: user_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_tasks (id, created_at, status, staff_id, updated_at, task_shift_id, task_id, task_name, site_id, site_name, site_address, service_name, report_template_id, description, start_time, end_time, customer_id, customer_name, notifies_staff, type, created_by, updated_by, site_location, company_name, check_in, check_out, images, pdf_file, admin_opened_at, customer_opened_at, staff_opened_at, admin_dashboard_dismissed_at, customer_dashboard_dismissed_at, service_id, cleared_at) FROM stdin;
208	2026-05-29 10:55:10.604	1	141	2026-05-29 10:55:33.171	0	0	New Report - 2026-05-29 10-53-54	82	H.J. Mahoney Park Amenities & Irrigation tank	570 Illawarra Rd, Marrickville NSW 2204	Roof and Gutter Cleaning	38		2026-05-29 10:55:10.578	2026-05-29 10:55:10.578	136	Patricia Habib	1	CUSTOM	141	141	-33.92086796138291, 151.14202418764845	Inner West Council	2026-05-29 10:55:10.578	2026-05-29 10:55:10.578	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1780016118422.pdf	\N	\N	2026-05-29 10:55:33.171	\N	\N	5	\N
142	2025-10-02 23:37:22	1	140	2025-10-02 23:37:22	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Dialy cleaning phottos 	2025-10-02 23:37:22	2025-10-02 23:37:22	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-02 23:37:22	2025-10-02 23:37:22	\N	http://3.104.215.45:8001/public/pdf/bayside-public-amenities-adam-kay-1759412249656.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
144	2025-10-04 07:48:34	1	140	2025-10-04 07:48:34	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning 	2025-10-04 07:48:34	2025-10-04 07:48:34	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-04 07:48:34	2025-10-04 07:48:34	\N	http://3.104.215.45:8001/public/pdf/bayside-public-amenities-adam-kay-1759528121337.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
163	2025-10-08 21:49:57	1	140	2025-10-08 21:49:57	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-08 21:49:57	2025-10-08 21:49:57	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-08 21:49:57	2025-10-08 21:49:57	\N	http://3.104.215.45:8001/public/pdf/bayside-public-amenities-adam-kay-1759920605526.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
168	2025-10-09 23:22:59	1	140	2025-10-09 23:22:59	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-09 23:22:59	2025-10-09 23:22:59	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-09 23:22:59	2025-10-09 23:22:59	\N	http://3.104.215.45:8001/public/pdf/bayside-public-amenities-adam-kay-1760012587144.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
169	2025-10-10 23:30:53	1	140	2025-10-10 23:30:53	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-10 23:30:53	2025-10-10 23:30:53	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-10 23:30:53	2025-10-10 23:30:53	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764235815077.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
173	2025-10-12 23:46:39	1	140	2025-10-12 23:46:39	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-12 23:46:39	2025-10-12 23:46:39	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-12 23:46:39	2025-10-12 23:46:39	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256508664.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
177	2025-10-13 22:35:30	1	140	2025-10-13 22:35:30	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-13 22:35:30	2025-10-13 22:35:30	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-13 22:35:30	2025-10-13 22:35:30	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256515186.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
186	2025-10-16 08:06:09	1	140	2025-10-16 08:06:09	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Dialy Cleaning Services 	2025-10-16 08:06:09	2025-10-16 08:06:09	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-16 08:06:09	2025-10-16 08:06:09	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256529663.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
188	2025-10-17 08:02:04	1	140	2025-10-17 08:02:04	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily Cleaning Services 	2025-10-17 08:02:04	2025-10-17 08:02:04	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-17 08:02:04	2025-10-17 08:02:04	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256538684.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
191	2025-10-18 09:27:24	1	140	2025-10-18 09:27:24	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily Cleaning Services 	2025-10-18 09:27:24	2025-10-18 09:27:24	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-18 09:27:24	2025-10-18 09:27:24	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256552722.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
194	2025-10-19 08:22:37	1	140	2025-10-19 08:22:37	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-19 08:22:37	2025-10-19 08:22:37	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-19 08:22:37	2025-10-19 08:22:37	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256564330.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
201	2025-10-22 09:04:32	1	140	2025-10-22 09:04:32	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily Cleaning Services 	2025-10-22 09:04:32	2025-10-22 09:04:32	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-22 09:04:32	2025-10-22 09:04:32	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256600065.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
209	2026-05-29 11:58:31.427	1	140	2026-05-29 11:58:42.123	0	0	New Report - 2026-05-29 11-57-38	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	72		2026-05-29 11:58:31.407	2026-05-29 11:58:31.407	139	Jessica Bosevska	1	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2026-05-29 11:58:31.407	2026-05-29 11:58:31.407	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1780019913118.pdf	\N	\N	2026-05-29 11:58:42.123	\N	\N	4	\N
174	2025-10-12 23:57:24	1	140	2025-10-12 23:57:24	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Dialy cleaning services 	2025-10-12 23:57:24	2025-10-12 23:57:24	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-12 23:57:24	2025-10-12 23:57:24	\N	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
138	2025-10-01 09:52:05	1	140	2025-10-01 09:52:05	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily cleaning 	2025-10-01 09:52:05	2025-10-01 09:52:05	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-01 09:52:05	2025-10-01 09:52:05	\N	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
136	2025-09-29 22:47:43	1	140	2025-09-29 22:47:43	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Mascot dialy cleaning 	2025-09-29 22:47:43	2025-09-29 22:47:43	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-09-29 22:47:43	2025-09-29 22:47:43	\N	http://3.104.215.45:8001/public/pdf/mascot-public-amenities-adam-kay-1759150068285.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
140	2025-10-01 23:37:06	1	140	2025-10-01 23:37:06	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily  cleaning 	2025-10-01 23:37:06	2025-10-01 23:37:06	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-01 23:37:06	2025-10-01 23:37:06	\N	http://3.104.215.45:8001/public/pdf/mascot-public-amenities-adam-kay-1759325831296.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
164	2025-10-08 23:04:04	1	140	2025-10-08 23:04:04	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-08 23:04:04	2025-10-08 23:04:04	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-08 23:04:04	2025-10-08 23:04:04	\N	http://3.104.215.45:8001/public/pdf/mascot-public-amenities-adam-kay-1759925052953.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
167	2025-10-09 23:19:43	1	140	2025-10-09 23:19:43	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-09 23:19:43	2025-10-09 23:19:43	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-09 23:19:43	2025-10-09 23:19:43	\N	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
198	2025-10-20 08:32:08	1	140	2025-10-20 08:32:08	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-20 08:32:08	2025-10-20 08:32:08	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-20 08:32:08	2025-10-20 08:32:08	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256580357.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
200	2025-10-21 07:30:15	1	140	2025-10-21 07:30:15	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-21 07:30:15	2025-10-21 07:30:15	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-21 07:30:15	2025-10-21 07:30:15	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256591832.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
143	2025-10-02 23:44:05	1	140	2025-10-02 23:44:05	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily cleaning phottos 	2025-10-02 23:44:05	2025-10-02 23:44:05	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-02 23:44:05	2025-10-02 23:44:05	\N	http://3.104.215.45:8001/public/pdf/mascot-public-amenities-adam-kay-1759412650286.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
145	2025-10-04 07:54:04	1	140	2025-10-04 07:54:04	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily cleaning 	2025-10-04 07:54:04	2025-10-04 07:54:04	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-04 07:54:04	2025-10-04 07:54:04	\N	http://3.104.215.45:8001/public/pdf/mascot-public-amenities-adam-kay-1759528449463.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
149	2025-10-05 09:45:06	1	140	2025-10-05 09:45:06	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily cleaning 	2025-10-05 09:45:06	2025-10-05 09:45:06	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-05 09:45:06	2025-10-05 09:45:06	\N	http://3.104.215.45:8001/public/pdf/mascot-public-amenities-adam-kay-1759617912600.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
150	2025-10-05 23:43:58	1	140	2025-10-05 23:43:58	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Dialy cleaning 	2025-10-05 23:43:58	2025-10-05 23:43:58	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-05 23:43:58	2025-10-05 23:43:58	\N	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
155	2025-10-06 23:33:24	1	140	2025-10-06 23:33:24	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily cleaning phottos 	2025-10-06 23:33:24	2025-10-06 23:33:24	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-06 23:33:24	2025-10-06 23:33:24	\N	http://3.104.215.45:8001/public/pdf/mascot-public-amenities-adam-kay-1759754011779.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
161	2025-10-07 23:37:46	1	140	2025-10-07 23:37:46	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-07 23:37:46	2025-10-07 23:37:46	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-07 23:37:46	2025-10-07 23:37:46	\N	http://3.104.215.45:8001/public/pdf/mascot-public-amenities-adam-kay-1759840674635.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
162	2025-10-08 11:28:13	1	140	2025-10-08 11:28:13	\N	\N	\N	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	33	September Contract - T1-20	2025-10-08 11:28:13	2025-10-08 11:28:13	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-08 11:28:13	2025-10-08 11:28:13	\N	http://3.104.215.45:8001/public/pdf/bayside-public-amenities-adam-kay-1759883295444.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
189	2025-10-17 08:11:36	1	140	2025-10-17 08:11:36	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily Cleaning Services 	2025-10-17 08:11:36	2025-10-17 08:11:36	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-17 08:11:36	2025-10-17 08:11:36	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256547769.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
133	2025-09-27 00:19:24	1	140	2025-09-27 00:19:24	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning 	2025-09-27 00:19:24	2025-09-27 00:19:24	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-09-27 00:19:24	2025-09-27 00:19:24	\N	http://3.104.215.45:8001/public/pdf/bayside-public-amenities-adam-kay-1758896371566.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
202	2025-10-22 09:11:14	1	140	2025-10-22 09:11:14	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily Cleaning Services 	2025-10-22 09:11:14	2025-10-22 09:11:14	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-22 09:11:14	2025-10-22 09:11:14	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256605218.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
206	2025-10-24 09:17:37	1	140	2025-10-24 09:17:37	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-24 09:17:37	2025-10-24 09:17:37	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-24 09:17:37	2025-10-24 09:17:37	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256618692.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
134	2025-09-27 00:41:32	1	140	2025-09-27 00:41:32	\N	\N	Mascot Public Amenities Cleaning Inspection Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning 	2025-09-27 00:41:32	2025-09-27 00:41:32	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-09-27 00:41:32	2025-09-27 00:41:32	\N	http://3.104.215.45:8001/public/pdf/bayside-public-amenities-adam-kay-1758897697735.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
170	2025-10-10 23:40:56	1	140	2025-10-10 23:40:56	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-10 23:40:56	2025-10-10 23:40:56	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-10 23:40:56	2025-10-10 23:40:56	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256501269.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
178	2025-10-13 22:48:50	1	140	2025-10-13 22:48:50	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-13 22:48:50	2025-10-13 22:48:50	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-13 22:48:50	2025-10-13 22:48:50	\N	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
182	2025-10-14 23:20:24	1	140	2025-10-14 23:20:24	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily Cleaning Services 	2025-10-14 23:20:24	2025-10-14 23:20:24	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-14 23:20:24	2025-10-14 23:20:24	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256518779.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
184	2025-10-16 07:55:24	1	140	2025-10-16 07:55:24	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily Cleaning Services 	2025-10-16 07:55:24	2025-10-16 07:55:24	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-16 07:55:24	2025-10-16 07:55:24	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256523083.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
193	2025-10-18 09:31:57	1	140	2025-10-18 09:31:57	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily Cleaning Services 	2025-10-18 09:31:57	2025-10-18 09:31:57	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-18 09:31:57	2025-10-18 09:31:57	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256557496.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
196	2025-10-19 08:26:33	1	140	2025-10-19 08:26:33	\N	\N	Mascot Public Amenities Cleaning Inspection Report	45	Mascot Public Amenities	80 High St, Mascot NSW 2020	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-19 08:26:33	2025-10-19 08:26:33	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.930395759209766, 151.18973111666878	Bayside Council	2025-10-19 08:26:33	2025-10-19 08:26:33	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256569237.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
197	2025-10-20 08:29:07	1	140	2025-10-20 08:29:07	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-20 08:29:07	2025-10-20 08:29:07	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-20 08:29:07	2025-10-20 08:29:07	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256575782.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
199	2025-10-21 07:24:11	1	140	2025-10-21 07:24:11	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-21 07:24:11	2025-10-21 07:24:11	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-21 07:24:11	2025-10-21 07:24:11	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256587561.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
137	2025-10-01 09:34:07	1	140	2025-10-01 09:34:07	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning 	2025-10-01 09:34:07	2025-10-01 09:34:07	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-01 09:34:07	2025-10-01 09:34:07	\N	http://3.104.215.45:8001/public/pdf/bayside-public-amenities-adam-kay-1759275254205.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
204	2025-10-24 09:09:31	1	140	2025-10-24 09:09:31	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning services 	2025-10-24 09:09:31	2025-10-24 09:09:31	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-24 09:09:31	2025-10-24 09:09:31	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256614938.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
207	2025-10-25 09:45:44	1	140	2025-10-25 09:45:44	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily Cleaning Services 	2025-10-25 09:45:44	2025-10-25 09:45:44	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-25 09:45:44	2025-10-25 09:45:44	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256628925.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
135	2025-09-29 22:15:43	1	140	2025-09-29 22:15:43	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning 	2025-09-29 22:15:43	2025-09-29 22:15:43	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-09-29 22:15:43	2025-09-29 22:15:43	\N	http://3.104.215.45:8001/public/pdf/bayside-public-amenities-adam-kay-1759148149941.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
139	2025-10-01 22:22:15	1	140	2025-10-01 22:22:15	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning 	2025-10-01 22:22:15	2025-10-01 22:22:15	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-01 22:22:15	2025-10-01 22:22:15	\N	http://3.104.215.45:8001/public/pdf/bayside-public-amenities-adam-kay-1759321342217.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
146	2025-10-05 09:30:58	1	140	2025-10-05 09:30:58	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning 	2025-10-05 09:30:58	2025-10-05 09:30:58	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-05 09:30:58	2025-10-05 09:30:58	\N	http://3.104.215.45:8001/public/pdf/bayside-public-amenities-adam-kay-1759617063883.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
151	2025-10-05 23:49:20	1	140	2025-10-05 23:49:20	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning phottos 	2025-10-05 23:49:20	2025-10-05 23:49:20	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-05 23:49:20	2025-10-05 23:49:20	\N	http://3.104.215.45:8001/public/pdf/bayside-public-amenities-adam-kay-1759668567407.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
160	2025-10-07 23:16:46	1	140	2025-10-07 23:16:46	\N	\N	Bayside Public Amenities Cleaning Report	37	Bayside Public Amenities	341 W Botany St, Rockdale NSW 2216	Public Amenities Cleaning	\N	Daily cleaning services	2025-10-07 23:16:46	2025-10-07 23:16:46	139	Jessica Bosevska	\N	CUSTOM	140	140	-33.955310609288254, 151.14647572689887	Bayside Council	2025-10-07 23:16:46	2025-10-07 23:16:46	\N	https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1764256279280.pdf	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	\N	2026-05-19 13:45:45.132794	2026-05-19 13:52:35.530879	4	\N
\.


--
-- TOC entry 5452 (class 0 OID 17240)
-- Dependencies: 262
-- Data for Name: user_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_tokens (id, user_key, token, status, type, expired, ip, os, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5454 (class 0 OID 17246)
-- Dependencies: 264
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password, full_name, status, last_login, last_version, type, created_at, updated_at, created_by, updated_by, avatar, phone, gender, dob, address, first_name, last_name, "position", allow_delete) FROM stdin;
150	helpdesk1@servicelink.net.au	helpdesk1@servicelink.net.au	$2b$10$KAOw8w/k4dv1IJeMszQMle1XNoPHQOoJbyHcneDXy7U468SitbB.W	Helpdesk	1	2026-05-29 10:15:56.889	1	3	2026-05-29 09:43:05.814	2026-05-29 10:15:56.890966	142	142	\N	\N	1	\N	\N	Helpdesk		\N	2
142	admin	servicelinknet@gmail.com	$2b$10$TlkgowxiArBzvLuI2AS4xemVROwxebGBHIMve5pGeZHVpsQW3.GFS	Servicelink   	1	2026-05-29 10:18:45.251	1.0.7	3	\N	2026-05-29 10:18:45.253092	\N	\N	\N	901188800	MALE	\N	\N	Servicelink 	 		2
140	Adam	adam@servicelink.net.au	$2b$10$sGna8XqUINeKNzHatr.vdeQd9dflypqkSB0c8oSS4zQ5J4HpFMoky	Adam Kay	1	2026-05-29 11:24:08.226	1.0.7	2	2025-08-11 12:27:22	2026-05-29 11:24:08.227115	1	1	\N	0420220220	1	\N	\N	Adam	Kay	Supervisor	2
139	Jessica	jessica.bosevska@bayside.nsw.gov.au	$2b$10$t6AvTWBJio8At2veIv45iOGevyKA7SoHwS1zOhd0Jyn/LXhKKUm5O	Jessica Bosevska	1	2026-05-29 12:04:47.852	\N	1	2025-08-11 12:06:38	2026-05-29 12:04:47.8537	1	1	\N	02 9562 1666	2	\N	\N	Jessica	Bosevska	Faciltiy Manager	2
138	helpdesk	helpdesk@servicelink.net.au	$2b$10$VsvbdRbko1iV4GS4CIJq5O4RMfOFLHw389F.j6vQpuU49x5fS7pdG	Help Desk	1	2026-05-25 13:48:32.064	\N	2	2025-08-05 13:54:18	2025-11-27 10:44:39	1	1	\N	0293925000	1	\N	\N	Help	Desk	admin	2
145	Alex Troanovsky	alex1@bayside.nsw.gov.au	$2b$10$Mu6wtV2ixkpHD/D3hcfnx.meRZzv8HIRBmsaRd12of9P5/p.NF/XG	Alex1 Troyanovsky	1	2026-05-28 13:18:38.211	\N	1	2026-05-25 12:38:53.792	2026-05-29 10:13:41.867594	142	142		02 9562 1666	1	\N	\N	Alex1	Troyanovsky	Faciltiy Manager	2
136	patricia.habib@innerwest.nsw.gov.au	patricia.habib@innerwest.nsw.gov.au	$2b$10$7v/SmvcsmwGGI5wB5b83Su/molxScyhC9586WESql2JqzzaDm003K	Patricia Habib	1	2026-05-28 12:52:07.394	\N	1	2025-07-23 13:09:18	2026-05-29 10:13:41.875822	1	1	\N	02 9392 5000	2	\N	\N	Patricia	Habib	Faciltiy Manager	2
146	Alex Troanovsky	alex@bayside.nsw.gov.au	$2b$10$npAM6b4Xgz0qEXJtwj4pyOiPEfGdhlzGJLt8nbJCdiaT3ao0Ue32K	Alex Troyanovsky	1	2026-05-28 12:11:25.675	\N	1	2026-05-25 12:39:07.731	2026-05-29 10:13:41.880955	142	142		02 9562 1666	1	\N	\N	Alex	Troyanovsky	Faciltiy Manager	2
141	Abo	a1arborist@outlook.com	$2b$10$GJRmm4nn3oMYrBo/KbNO.eX9ghC/lm8H9eNPxSW2kr/vmoczWG9dq	Abo Taleb	1	2026-05-29 10:28:59.419	1.0.7	2	2025-08-12 11:57:05	2026-05-29 10:28:59.420287	1	1	\N	0452410823	1	\N	\N	Abo	Taleb	A1 Arborist Tree Services	2
\.


--
-- TOC entry 5517 (class 0 OID 0)
-- Dependencies: 272
-- Name: customer_admin_message_deletions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customer_admin_message_deletions_id_seq', 16, true);


--
-- TOC entry 5518 (class 0 OID 0)
-- Dependencies: 270
-- Name: customer_admin_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customer_admin_messages_id_seq', 46, true);


--
-- TOC entry 5519 (class 0 OID 0)
-- Dependencies: 268
-- Name: customer_admin_threads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customer_admin_threads_id_seq', 6, true);


--
-- TOC entry 5520 (class 0 OID 0)
-- Dependencies: 283
-- Name: customer_companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customer_companies_id_seq', 833, true);


--
-- TOC entry 5521 (class 0 OID 0)
-- Dependencies: 226
-- Name: items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.items_id_seq', 1, false);


--
-- TOC entry 5522 (class 0 OID 0)
-- Dependencies: 228
-- Name: logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.logs_id_seq', 1, false);


--
-- TOC entry 5523 (class 0 OID 0)
-- Dependencies: 290
-- Name: report_fault_admin_visibility_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.report_fault_admin_visibility_id_seq', 146, true);


--
-- TOC entry 5524 (class 0 OID 0)
-- Dependencies: 277
-- Name: report_fault_answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.report_fault_answers_id_seq', 105, true);


--
-- TOC entry 5525 (class 0 OID 0)
-- Dependencies: 292
-- Name: report_fault_customer_visibility_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.report_fault_customer_visibility_id_seq', 369, true);


--
-- TOC entry 5526 (class 0 OID 0)
-- Dependencies: 266
-- Name: report_faults_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.report_faults_id_seq', 101, true);


--
-- TOC entry 5527 (class 0 OID 0)
-- Dependencies: 274
-- Name: report_template_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.report_template_categories_id_seq', 11, true);


--
-- TOC entry 5528 (class 0 OID 0)
-- Dependencies: 232
-- Name: report_template_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.report_template_items_id_seq', 1555, true);


--
-- TOC entry 5529 (class 0 OID 0)
-- Dependencies: 234
-- Name: report_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.report_templates_id_seq', 72, true);


--
-- TOC entry 5530 (class 0 OID 0)
-- Dependencies: 285
-- Name: services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.services_id_seq', 6, true);


--
-- TOC entry 5531 (class 0 OID 0)
-- Dependencies: 280
-- Name: site_item_staff_shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.site_item_staff_shifts_id_seq', 588, true);


--
-- TOC entry 5532 (class 0 OID 0)
-- Dependencies: 279
-- Name: site_item_staffs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.site_item_staffs_id_seq', 555, true);


--
-- TOC entry 5533 (class 0 OID 0)
-- Dependencies: 278
-- Name: site_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.site_items_id_seq', 298, true);


--
-- TOC entry 5534 (class 0 OID 0)
-- Dependencies: 276
-- Name: sites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sites_id_seq', 207, true);


--
-- TOC entry 5535 (class 0 OID 0)
-- Dependencies: 244
-- Name: task_shift_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.task_shift_logs_id_seq', 1, true);


--
-- TOC entry 5536 (class 0 OID 0)
-- Dependencies: 246
-- Name: task_shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.task_shifts_id_seq', 1, true);


--
-- TOC entry 5537 (class 0 OID 0)
-- Dependencies: 248
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tasks_id_seq', 1, true);


--
-- TOC entry 5538 (class 0 OID 0)
-- Dependencies: 250
-- Name: ticket_answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ticket_answers_id_seq', 1, false);


--
-- TOC entry 5539 (class 0 OID 0)
-- Dependencies: 252
-- Name: tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tickets_id_seq', 1, false);


--
-- TOC entry 5540 (class 0 OID 0)
-- Dependencies: 254
-- Name: user_daily_job_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_daily_job_items_id_seq', 8, true);


--
-- TOC entry 5541 (class 0 OID 0)
-- Dependencies: 256
-- Name: user_daily_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_daily_jobs_id_seq', 7, true);


--
-- TOC entry 5542 (class 0 OID 0)
-- Dependencies: 259
-- Name: user_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_roles_id_seq', 961, true);


--
-- TOC entry 5543 (class 0 OID 0)
-- Dependencies: 288
-- Name: user_task_admin_visibility_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_task_admin_visibility_id_seq', 141, true);


--
-- TOC entry 5544 (class 0 OID 0)
-- Dependencies: 286
-- Name: user_task_customer_visibility_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_task_customer_visibility_id_seq', 323, true);


--
-- TOC entry 5545 (class 0 OID 0)
-- Dependencies: 282
-- Name: user_task_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_task_reports_id_seq', 1607, true);


--
-- TOC entry 5546 (class 0 OID 0)
-- Dependencies: 281
-- Name: user_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_tasks_id_seq', 233, true);


--
-- TOC entry 5547 (class 0 OID 0)
-- Dependencies: 263
-- Name: user_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_tokens_id_seq', 1, false);


--
-- TOC entry 5548 (class 0 OID 0)
-- Dependencies: 265
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 150, true);


--
-- TOC entry 5210 (class 2606 OID 42024)
-- Name: report_template_categories UQ_report_template_categories_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_template_categories
    ADD CONSTRAINT "UQ_report_template_categories_name" UNIQUE (name);


--
-- TOC entry 5204 (class 2606 OID 41564)
-- Name: customer_admin_message_deletions customer_admin_message_deletions_message_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_admin_message_deletions
    ADD CONSTRAINT customer_admin_message_deletions_message_id_user_id_key UNIQUE (message_id, user_id);


--
-- TOC entry 5206 (class 2606 OID 41562)
-- Name: customer_admin_message_deletions customer_admin_message_deletions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_admin_message_deletions
    ADD CONSTRAINT customer_admin_message_deletions_pkey PRIMARY KEY (id);


--
-- TOC entry 5201 (class 2606 OID 41387)
-- Name: customer_admin_messages customer_admin_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_admin_messages
    ADD CONSTRAINT customer_admin_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 5196 (class 2606 OID 41369)
-- Name: customer_admin_threads customer_admin_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_admin_threads
    ADD CONSTRAINT customer_admin_threads_pkey PRIMARY KEY (id);


--
-- TOC entry 5214 (class 2606 OID 43206)
-- Name: customer_companies customer_companies_normalized_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_companies
    ADD CONSTRAINT customer_companies_normalized_name_key UNIQUE (normalized_name);


--
-- TOC entry 5216 (class 2606 OID 43204)
-- Name: customer_companies customer_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_companies
    ADD CONSTRAINT customer_companies_pkey PRIMARY KEY (id);


--
-- TOC entry 5111 (class 2606 OID 17276)
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (user_id);


--
-- TOC entry 5115 (class 2606 OID 17280)
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- TOC entry 5117 (class 2606 OID 17282)
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- TOC entry 5120 (class 2606 OID 17284)
-- Name: logs logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5122 (class 2606 OID 17286)
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- TOC entry 5233 (class 2606 OID 44636)
-- Name: report_fault_admin_visibility report_fault_admin_visibility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_fault_admin_visibility
    ADD CONSTRAINT report_fault_admin_visibility_pkey PRIMARY KEY (id);


--
-- TOC entry 5235 (class 2606 OID 44638)
-- Name: report_fault_admin_visibility report_fault_admin_visibility_report_fault_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_fault_admin_visibility
    ADD CONSTRAINT report_fault_admin_visibility_report_fault_id_user_id_key UNIQUE (report_fault_id, user_id);


--
-- TOC entry 5124 (class 2606 OID 42223)
-- Name: report_fault_answers report_fault_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_fault_answers
    ADD CONSTRAINT report_fault_answers_pkey PRIMARY KEY (id);


--
-- TOC entry 5239 (class 2606 OID 44920)
-- Name: report_fault_customer_visibility report_fault_customer_visibility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_fault_customer_visibility
    ADD CONSTRAINT report_fault_customer_visibility_pkey PRIMARY KEY (id);


--
-- TOC entry 5241 (class 2606 OID 44922)
-- Name: report_fault_customer_visibility report_fault_customer_visibility_report_fault_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_fault_customer_visibility
    ADD CONSTRAINT report_fault_customer_visibility_report_fault_id_user_id_key UNIQUE (report_fault_id, user_id);


--
-- TOC entry 5130 (class 2606 OID 42221)
-- Name: report_faults report_faults_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_faults
    ADD CONSTRAINT report_faults_pkey PRIMARY KEY (id);


--
-- TOC entry 5212 (class 2606 OID 42022)
-- Name: report_template_categories report_template_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_template_categories
    ADD CONSTRAINT report_template_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 5132 (class 2606 OID 17290)
-- Name: report_template_items report_template_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_template_items
    ADD CONSTRAINT report_template_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5244 (class 2606 OID 46734)
-- Name: report_template_services report_template_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_template_services
    ADD CONSTRAINT report_template_services_pkey PRIMARY KEY (report_template_id, service_id);


--
-- TOC entry 5134 (class 2606 OID 17292)
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5136 (class 2606 OID 17294)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5194 (class 2606 OID 41298)
-- Name: schema_patches_applied schema_patches_applied_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_patches_applied
    ADD CONSTRAINT schema_patches_applied_pkey PRIMARY KEY (name);


--
-- TOC entry 5113 (class 2606 OID 43850)
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- TOC entry 5138 (class 2606 OID 17296)
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (setting_key);


--
-- TOC entry 5140 (class 2606 OID 42217)
-- Name: site_item_staff_shifts site_item_staff_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_item_staff_shifts
    ADD CONSTRAINT site_item_staff_shifts_pkey PRIMARY KEY (id);


--
-- TOC entry 5142 (class 2606 OID 42215)
-- Name: site_item_staffs site_item_staffs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_item_staffs
    ADD CONSTRAINT site_item_staffs_pkey PRIMARY KEY (id);


--
-- TOC entry 5146 (class 2606 OID 42213)
-- Name: site_items site_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_items
    ADD CONSTRAINT site_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5150 (class 2606 OID 42166)
-- Name: sites sites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_pkey PRIMARY KEY (id);


--
-- TOC entry 5152 (class 2606 OID 17298)
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (user_id);


--
-- TOC entry 5156 (class 2606 OID 17300)
-- Name: task_shift_logs task_shift_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_shift_logs
    ADD CONSTRAINT task_shift_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5159 (class 2606 OID 17302)
-- Name: task_shifts task_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_shifts
    ADD CONSTRAINT task_shifts_pkey PRIMARY KEY (id);


--
-- TOC entry 5161 (class 2606 OID 17304)
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 5163 (class 2606 OID 17306)
-- Name: ticket_answers ticket_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_answers
    ADD CONSTRAINT ticket_answers_pkey PRIMARY KEY (id);


--
-- TOC entry 5165 (class 2606 OID 17308)
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- TOC entry 5144 (class 2606 OID 42281)
-- Name: site_item_staffs uq_site_item_staffs_item_staff; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_item_staffs
    ADD CONSTRAINT uq_site_item_staffs_item_staff UNIQUE (site_item_id, staff_id);


--
-- TOC entry 5148 (class 2606 OID 43887)
-- Name: site_items uq_site_items_site_svc_customer; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_items
    ADD CONSTRAINT uq_site_items_site_svc_customer UNIQUE (site_id, service_id, customer_id);


--
-- TOC entry 5174 (class 2606 OID 42363)
-- Name: user_roles uq_user_roles_user_role; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role_id);


--
-- TOC entry 5178 (class 2606 OID 42365)
-- Name: user_task_reports uq_user_task_reports_task_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_task_reports
    ADD CONSTRAINT uq_user_task_reports_task_name UNIQUE (user_task_id, name);


--
-- TOC entry 5168 (class 2606 OID 17312)
-- Name: user_daily_job_items user_daily_job_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_daily_job_items
    ADD CONSTRAINT user_daily_job_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5170 (class 2606 OID 17314)
-- Name: user_daily_jobs user_daily_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_daily_jobs
    ADD CONSTRAINT user_daily_jobs_pkey PRIMARY KEY (id);


--
-- TOC entry 5172 (class 2606 OID 17316)
-- Name: user_groups user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_pkey PRIMARY KEY (user_id, group_id);


--
-- TOC entry 5176 (class 2606 OID 42361)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5227 (class 2606 OID 44617)
-- Name: user_task_admin_visibility user_task_admin_visibility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_task_admin_visibility
    ADD CONSTRAINT user_task_admin_visibility_pkey PRIMARY KEY (id);


--
-- TOC entry 5229 (class 2606 OID 44619)
-- Name: user_task_admin_visibility user_task_admin_visibility_user_task_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_task_admin_visibility
    ADD CONSTRAINT user_task_admin_visibility_user_task_id_user_id_key UNIQUE (user_task_id, user_id);


--
-- TOC entry 5221 (class 2606 OID 44478)
-- Name: user_task_customer_visibility user_task_customer_visibility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_task_customer_visibility
    ADD CONSTRAINT user_task_customer_visibility_pkey PRIMARY KEY (id);


--
-- TOC entry 5223 (class 2606 OID 44480)
-- Name: user_task_customer_visibility user_task_customer_visibility_user_task_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_task_customer_visibility
    ADD CONSTRAINT user_task_customer_visibility_user_task_id_user_id_key UNIQUE (user_task_id, user_id);


--
-- TOC entry 5180 (class 2606 OID 42359)
-- Name: user_task_reports user_task_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_task_reports
    ADD CONSTRAINT user_task_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 5187 (class 2606 OID 42219)
-- Name: user_tasks user_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tasks
    ADD CONSTRAINT user_tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 5189 (class 2606 OID 17322)
-- Name: user_tokens user_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT user_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 5192 (class 2606 OID 17324)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5207 (class 1259 OID 41571)
-- Name: idx_camd_message_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_camd_message_id ON public.customer_admin_message_deletions USING btree (message_id);


--
-- TOC entry 5208 (class 1259 OID 41570)
-- Name: idx_camd_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_camd_user_id ON public.customer_admin_message_deletions USING btree (user_id);


--
-- TOC entry 5202 (class 1259 OID 41393)
-- Name: idx_customer_admin_messages_thread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_admin_messages_thread ON public.customer_admin_messages USING btree (thread_id, created_at);


--
-- TOC entry 5197 (class 1259 OID 41434)
-- Name: idx_customer_admin_threads_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_customer_admin_threads_customer ON public.customer_admin_threads USING btree (customer_id) WHERE (customer_id IS NOT NULL);


--
-- TOC entry 5198 (class 1259 OID 41435)
-- Name: idx_customer_admin_threads_staff; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_customer_admin_threads_staff ON public.customer_admin_threads USING btree (staff_id) WHERE (staff_id IS NOT NULL);


--
-- TOC entry 5199 (class 1259 OID 47432)
-- Name: idx_customer_admin_threads_staff_peer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_customer_admin_threads_staff_peer ON public.customer_admin_threads USING btree (staff_id, peer_staff_id) WHERE ((staff_id IS NOT NULL) AND (peer_staff_id IS NOT NULL));


--
-- TOC entry 5118 (class 1259 OID 17325)
-- Name: idx_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_user_id ON public.logs USING btree (user_id);


--
-- TOC entry 5125 (class 1259 OID 41956)
-- Name: idx_report_faults_dashboard_badge_admin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_faults_dashboard_badge_admin ON public.report_faults USING btree (status, staff_id) WHERE ((admin_dashboard_dismissed_at IS NULL) AND (staff_id > 0));


--
-- TOC entry 5126 (class 1259 OID 41958)
-- Name: idx_report_faults_dashboard_badge_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_faults_dashboard_badge_customer ON public.report_faults USING btree (customer_id, status) WHERE ((customer_dashboard_dismissed_at IS NULL) AND (staff_id > 0));


--
-- TOC entry 5127 (class 1259 OID 41308)
-- Name: idx_report_faults_unread_admin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_faults_unread_admin ON public.report_faults USING btree (status, staff_id) WHERE ((admin_opened_at IS NULL) AND (staff_id > 0));


--
-- TOC entry 5128 (class 1259 OID 41328)
-- Name: idx_report_faults_unread_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_faults_unread_customer ON public.report_faults USING btree (customer_id, status) WHERE ((customer_opened_at IS NULL) AND (staff_id > 0));


--
-- TOC entry 5242 (class 1259 OID 46735)
-- Name: idx_report_template_services_service_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_template_services_service_id ON public.report_template_services USING btree (service_id);


--
-- TOC entry 5230 (class 1259 OID 44645)
-- Name: idx_rfav_report_fault_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rfav_report_fault_id ON public.report_fault_admin_visibility USING btree (report_fault_id);


--
-- TOC entry 5231 (class 1259 OID 44644)
-- Name: idx_rfav_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rfav_user_id ON public.report_fault_admin_visibility USING btree (user_id);


--
-- TOC entry 5236 (class 1259 OID 44929)
-- Name: idx_rfcv_report_fault_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rfcv_report_fault_id ON public.report_fault_customer_visibility USING btree (report_fault_id);


--
-- TOC entry 5237 (class 1259 OID 44928)
-- Name: idx_rfcv_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rfcv_user_id ON public.report_fault_customer_visibility USING btree (user_id);


--
-- TOC entry 5153 (class 1259 OID 17326)
-- Name: idx_task_shift_logs_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_shift_logs_task_id ON public.task_shift_logs USING btree (task_id);


--
-- TOC entry 5154 (class 1259 OID 17327)
-- Name: idx_task_shift_logs_task_shift_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_shift_logs_task_shift_id ON public.task_shift_logs USING btree (task_shift_id);


--
-- TOC entry 5157 (class 1259 OID 17328)
-- Name: idx_task_shifts_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_shifts_task_id ON public.task_shifts USING btree (task_id);


--
-- TOC entry 5166 (class 1259 OID 17329)
-- Name: idx_user_daily_job_items_user_daily_job_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_daily_job_items_user_daily_job_id ON public.user_daily_job_items USING btree (user_daily_job_id);


--
-- TOC entry 5181 (class 1259 OID 47856)
-- Name: idx_user_tasks_cleared_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_tasks_cleared_at ON public.user_tasks USING btree (cleared_at);


--
-- TOC entry 5182 (class 1259 OID 41955)
-- Name: idx_user_tasks_dashboard_badge_admin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_tasks_dashboard_badge_admin ON public.user_tasks USING btree (type, status, staff_id) WHERE ((admin_dashboard_dismissed_at IS NULL) AND ((type)::text = 'CUSTOM'::text) AND (staff_id > 0));


--
-- TOC entry 5183 (class 1259 OID 41957)
-- Name: idx_user_tasks_dashboard_badge_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_tasks_dashboard_badge_customer ON public.user_tasks USING btree (customer_id, type, status) WHERE ((customer_dashboard_dismissed_at IS NULL) AND ((type)::text = 'CUSTOM'::text) AND (staff_id > 0));


--
-- TOC entry 5184 (class 1259 OID 41307)
-- Name: idx_user_tasks_unread_custom_reports; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_tasks_unread_custom_reports ON public.user_tasks USING btree (type, status, staff_id) WHERE ((admin_opened_at IS NULL) AND ((type)::text = 'CUSTOM'::text) AND (staff_id > 0));


--
-- TOC entry 5185 (class 1259 OID 41327)
-- Name: idx_user_tasks_unread_customer_reports; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_tasks_unread_customer_reports ON public.user_tasks USING btree (customer_id, type, status) WHERE ((customer_opened_at IS NULL) AND ((type)::text = 'CUSTOM'::text) AND (staff_id > 0));


--
-- TOC entry 5224 (class 1259 OID 44625)
-- Name: idx_utav_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_utav_user_id ON public.user_task_admin_visibility USING btree (user_id);


--
-- TOC entry 5225 (class 1259 OID 44626)
-- Name: idx_utav_user_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_utav_user_task_id ON public.user_task_admin_visibility USING btree (user_task_id);


--
-- TOC entry 5217 (class 1259 OID 47855)
-- Name: idx_utcv_cleared_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_utcv_cleared_at ON public.user_task_customer_visibility USING btree (cleared_at);


--
-- TOC entry 5218 (class 1259 OID 44486)
-- Name: idx_utcv_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_utcv_user_id ON public.user_task_customer_visibility USING btree (user_id);


--
-- TOC entry 5219 (class 1259 OID 44487)
-- Name: idx_utcv_user_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_utcv_user_task_id ON public.user_task_customer_visibility USING btree (user_task_id);


--
-- TOC entry 5190 (class 1259 OID 42949)
-- Name: users_email_unique_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_unique_active ON public.users USING btree (lower(TRIM(BOTH FROM email))) WHERE ((status = 1) AND (email IS NOT NULL) AND (TRIM(BOTH FROM email) <> ''::text));


--
-- TOC entry 5258 (class 2606 OID 41565)
-- Name: customer_admin_message_deletions customer_admin_message_deletions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_admin_message_deletions
    ADD CONSTRAINT customer_admin_message_deletions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.customer_admin_messages(id) ON DELETE CASCADE;


--
-- TOC entry 5257 (class 2606 OID 41388)
-- Name: customer_admin_messages customer_admin_messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_admin_messages
    ADD CONSTRAINT customer_admin_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.customer_admin_threads(id) ON DELETE CASCADE;


--
-- TOC entry 5245 (class 2606 OID 43207)
-- Name: customers customers_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.customer_companies(id) ON DELETE SET NULL;


--
-- TOC entry 5263 (class 2606 OID 46760)
-- Name: report_template_services fk_rtd_report_template; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_template_services
    ADD CONSTRAINT fk_rtd_report_template FOREIGN KEY (report_template_id) REFERENCES public.report_templates(id) ON DELETE CASCADE;


--
-- TOC entry 5264 (class 2606 OID 46765)
-- Name: report_template_services fk_rts_service; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_template_services
    ADD CONSTRAINT fk_rts_service FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- TOC entry 5247 (class 2606 OID 43858)
-- Name: groups groups_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- TOC entry 5261 (class 2606 OID 44639)
-- Name: report_fault_admin_visibility report_fault_admin_visibility_report_fault_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_fault_admin_visibility
    ADD CONSTRAINT report_fault_admin_visibility_report_fault_id_fkey FOREIGN KEY (report_fault_id) REFERENCES public.report_faults(id) ON DELETE CASCADE;


--
-- TOC entry 5262 (class 2606 OID 44923)
-- Name: report_fault_customer_visibility report_fault_customer_visibility_report_fault_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_fault_customer_visibility
    ADD CONSTRAINT report_fault_customer_visibility_report_fault_id_fkey FOREIGN KEY (report_fault_id) REFERENCES public.report_faults(id) ON DELETE CASCADE;


--
-- TOC entry 5248 (class 2606 OID 43863)
-- Name: report_faults report_faults_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_faults
    ADD CONSTRAINT report_faults_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- TOC entry 5254 (class 2606 OID 17331)
-- Name: ticket_answers rf_ticket_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_answers
    ADD CONSTRAINT rf_ticket_id FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- TOC entry 5253 (class 2606 OID 17336)
-- Name: task_shifts rf_ts_task_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_shifts
    ADD CONSTRAINT rf_ts_task_id FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 5251 (class 2606 OID 17341)
-- Name: task_shift_logs rf_tsl_task_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_shift_logs
    ADD CONSTRAINT rf_tsl_task_id FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 5252 (class 2606 OID 17346)
-- Name: task_shift_logs rf_tsl_task_shift_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_shift_logs
    ADD CONSTRAINT rf_tsl_task_shift_id FOREIGN KEY (task_shift_id) REFERENCES public.task_shifts(id) ON DELETE CASCADE;


--
-- TOC entry 5246 (class 2606 OID 17351)
-- Name: customers rf_ud_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT rf_ud_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5256 (class 2606 OID 17356)
-- Name: user_daily_job_items rf_user_daily_job_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_daily_job_items
    ADD CONSTRAINT rf_user_daily_job_id FOREIGN KEY (user_daily_job_id) REFERENCES public.user_daily_jobs(id) ON DELETE CASCADE;


--
-- TOC entry 5249 (class 2606 OID 43853)
-- Name: site_items site_items_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_items
    ADD CONSTRAINT site_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- TOC entry 5250 (class 2606 OID 17366)
-- Name: staff staff_ibfk_1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_ibfk_1 FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5255 (class 2606 OID 43868)
-- Name: tickets tickets_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- TOC entry 5260 (class 2606 OID 44620)
-- Name: user_task_admin_visibility user_task_admin_visibility_user_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_task_admin_visibility
    ADD CONSTRAINT user_task_admin_visibility_user_task_id_fkey FOREIGN KEY (user_task_id) REFERENCES public.user_tasks(id) ON DELETE CASCADE;


--
-- TOC entry 5259 (class 2606 OID 44481)
-- Name: user_task_customer_visibility user_task_customer_visibility_user_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_task_customer_visibility
    ADD CONSTRAINT user_task_customer_visibility_user_task_id_fkey FOREIGN KEY (user_task_id) REFERENCES public.user_tasks(id) ON DELETE CASCADE;


-- Completed on 2026-05-29 12:32:06

--
-- PostgreSQL database dump complete
--

\unrestrict KjpdeFubTIvbH4yW75ZwELWHwxO0vugxshkdHpfgXZyIeeS7cASEZAU1SpFT4SH

