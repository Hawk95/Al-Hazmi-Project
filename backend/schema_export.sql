--
-- PostgreSQL database dump
--

\restrict jQ828JPO0JF0N8AYO9SPdvtDTww5VVr80lX9GFuG9AxeuCnjpr3MssSBfcdWiUp

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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
-- Name: erp; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA erp;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attendance; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.attendance (
    id integer NOT NULL,
    employee_id integer,
    employee_name character varying(100),
    attendance_date date NOT NULL,
    status character varying(20) DEFAULT 'present'::character varying,
    check_in time without time zone,
    check_out time without time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    check_in_method character varying(10) DEFAULT 'manual'::character varying,
    check_in_lat numeric(10,6),
    check_in_lng numeric(10,6),
    check_out_method character varying(10) DEFAULT 'manual'::character varying,
    check_out_lat numeric(10,6),
    check_out_lng numeric(10,6)
);


--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.attendance_id_seq OWNED BY erp.attendance.id;


--
-- Name: bills; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.bills (
    id integer NOT NULL,
    bill_number character varying(20) NOT NULL,
    po_id integer,
    supplier_id integer,
    supplier_name character varying(200),
    subtotal numeric(14,2) DEFAULT 0 NOT NULL,
    vat_rate numeric(5,2) DEFAULT 5.00 NOT NULL,
    vat_amount numeric(14,2) DEFAULT 0 NOT NULL,
    total_amount numeric(14,2) DEFAULT 0 NOT NULL,
    paid_amount numeric(14,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'issued'::character varying NOT NULL,
    due_date date,
    paid_at timestamp without time zone,
    payment_method character varying(50),
    payment_notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: bills_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.bills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bills_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.bills_id_seq OWNED BY erp.bills.id;


--
-- Name: credit_notes; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.credit_notes (
    id integer NOT NULL,
    cn_number character varying(20) NOT NULL,
    invoice_id integer NOT NULL,
    so_id integer NOT NULL,
    reason text,
    total_amount numeric(14,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: credit_notes_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.credit_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: credit_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.credit_notes_id_seq OWNED BY erp.credit_notes.id;


--
-- Name: customers; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.customers (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    phone character varying(50),
    email character varying(200),
    address text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.customers_id_seq OWNED BY erp.customers.id;


--
-- Name: daily_distributions; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.daily_distributions (
    id integer NOT NULL,
    salesman_id integer,
    salesman_name character varying(200),
    distribution_date date DEFAULT CURRENT_DATE NOT NULL,
    emirate character varying(100) NOT NULL,
    meat_type character varying(100) DEFAULT 'Lamb'::character varying NOT NULL,
    quantity_kg numeric(10,2) NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    unit character varying(10) DEFAULT 'kg'::character varying,
    returned_qty numeric(10,2) DEFAULT 0
);


--
-- Name: daily_distributions_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.daily_distributions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_distributions_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.daily_distributions_id_seq OWNED BY erp.daily_distributions.id;


--
-- Name: deliveries; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.deliveries (
    id integer NOT NULL,
    order_id integer,
    driver_name character varying,
    vehicle_number character varying,
    status character varying DEFAULT 'scheduled'::character varying,
    scheduled_at timestamp without time zone,
    delivered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: deliveries_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.deliveries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: deliveries_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.deliveries_id_seq OWNED BY erp.deliveries.id;


--
-- Name: employees; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.employees (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    department character varying(50),
    "position" character varying(100),
    phone character varying(20),
    email character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    shift_start time without time zone DEFAULT '09:00:00'::time without time zone,
    shift_end time without time zone DEFAULT '18:00:00'::time without time zone,
    monthly_salary numeric(10,2) DEFAULT 0,
    hourly_rate numeric(8,2) DEFAULT 0,
    portal_pin character varying(4)
);


--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.employees_id_seq OWNED BY erp.employees.id;


--
-- Name: invoices; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.invoices (
    id integer NOT NULL,
    invoice_number character varying(20) NOT NULL,
    so_id integer NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying,
    total_amount numeric(14,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    due_date date,
    paid_amount numeric(14,2) DEFAULT 0 NOT NULL,
    paid_at timestamp without time zone,
    payment_method character varying(50),
    payment_notes text,
    updated_at timestamp without time zone DEFAULT now(),
    subtotal numeric(14,2) DEFAULT 0 NOT NULL,
    vat_rate numeric(5,2) DEFAULT 5.00 NOT NULL,
    vat_amount numeric(14,2) DEFAULT 0 NOT NULL
);


--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.invoices_id_seq OWNED BY erp.invoices.id;


--
-- Name: order_items; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer,
    product_name character varying(255) NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL
);


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.order_items_id_seq OWNED BY erp.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.orders (
    id integer NOT NULL,
    order_number character varying NOT NULL,
    customer_name character varying NOT NULL,
    status character varying DEFAULT 'pending'::character varying,
    total_amount double precision DEFAULT 0.0,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.orders_id_seq OWNED BY erp.orders.id;


--
-- Name: products; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.products (
    id integer NOT NULL,
    name character varying NOT NULL,
    category character varying,
    quantity_kg double precision DEFAULT 0.0,
    min_stock_kg double precision DEFAULT 0.0,
    price_per_kg double precision DEFAULT 0.0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    stock_expected numeric(12,3) DEFAULT 0 NOT NULL,
    stock_reserved numeric(12,3) DEFAULT 0 NOT NULL,
    stock_dispatched numeric(12,3) DEFAULT 0 NOT NULL
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.products_id_seq OWNED BY erp.products.id;


--
-- Name: purchase_order_items; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.purchase_order_items (
    id integer NOT NULL,
    po_id integer NOT NULL,
    product_id integer,
    product_name character varying(200) NOT NULL,
    quantity numeric(12,3) NOT NULL,
    unit_price numeric(12,2) DEFAULT 0 NOT NULL
);


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.purchase_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.purchase_order_items_id_seq OWNED BY erp.purchase_order_items.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.purchase_orders (
    id integer NOT NULL,
    po_number character varying(20) NOT NULL,
    supplier_id integer,
    supplier_name character varying(200),
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    notes text,
    expected_date date,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.purchase_orders_id_seq OWNED BY erp.purchase_orders.id;


--
-- Name: return_entries; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.return_entries (
    id integer NOT NULL,
    re_number character varying(20) NOT NULL,
    so_id integer NOT NULL,
    credit_note_id integer,
    rejection_reason text,
    status character varying(20) DEFAULT 'pending'::character varying,
    confirmed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: return_entries_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.return_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: return_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.return_entries_id_seq OWNED BY erp.return_entries.id;


--
-- Name: return_entry_items; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.return_entry_items (
    id integer NOT NULL,
    re_id integer NOT NULL,
    product_id integer,
    product_name character varying(200) NOT NULL,
    quantity numeric(12,3) NOT NULL
);


--
-- Name: return_entry_items_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.return_entry_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: return_entry_items_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.return_entry_items_id_seq OWNED BY erp.return_entry_items.id;


--
-- Name: sale_order_items; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.sale_order_items (
    id integer NOT NULL,
    so_id integer NOT NULL,
    product_id integer,
    product_name character varying(200) NOT NULL,
    quantity numeric(12,3) NOT NULL,
    unit_price numeric(12,2) DEFAULT 0 NOT NULL,
    total_price numeric(14,2) DEFAULT 0 NOT NULL
);


--
-- Name: sale_order_items_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.sale_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sale_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.sale_order_items_id_seq OWNED BY erp.sale_order_items.id;


--
-- Name: sale_orders; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.sale_orders (
    id integer NOT NULL,
    so_number character varying(20) NOT NULL,
    customer_name character varying(200) NOT NULL,
    customer_phone character varying(50),
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    total_amount numeric(14,2) DEFAULT 0,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    customer_id integer
);


--
-- Name: sale_orders_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.sale_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sale_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.sale_orders_id_seq OWNED BY erp.sale_orders.id;


--
-- Name: salesmen; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.salesmen (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    phone character varying(50),
    email character varying(200),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: salesmen_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.salesmen_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: salesmen_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.salesmen_id_seq OWNED BY erp.salesmen.id;


--
-- Name: suppliers; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.suppliers (
    id integer NOT NULL,
    name character varying NOT NULL,
    contact_name character varying,
    email character varying,
    phone character varying,
    address text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.suppliers_id_seq OWNED BY erp.suppliers.id;


--
-- Name: user_permissions; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.user_permissions (
    user_id integer NOT NULL,
    permission character varying(50) NOT NULL,
    granted_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: erp; Owner: -
--

CREATE TABLE erp.users (
    id integer NOT NULL,
    email character varying NOT NULL,
    hashed_password character varying NOT NULL,
    is_active boolean DEFAULT true,
    is_admin boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    full_name character varying(120),
    phone character varying(30),
    last_login timestamp without time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: erp; Owner: -
--

CREATE SEQUENCE erp.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: -
--

ALTER SEQUENCE erp.users_id_seq OWNED BY erp.users.id;


--
-- Name: attendance id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.attendance ALTER COLUMN id SET DEFAULT nextval('erp.attendance_id_seq'::regclass);


--
-- Name: bills id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.bills ALTER COLUMN id SET DEFAULT nextval('erp.bills_id_seq'::regclass);


--
-- Name: credit_notes id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.credit_notes ALTER COLUMN id SET DEFAULT nextval('erp.credit_notes_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.customers ALTER COLUMN id SET DEFAULT nextval('erp.customers_id_seq'::regclass);


--
-- Name: daily_distributions id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.daily_distributions ALTER COLUMN id SET DEFAULT nextval('erp.daily_distributions_id_seq'::regclass);


--
-- Name: deliveries id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.deliveries ALTER COLUMN id SET DEFAULT nextval('erp.deliveries_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.employees ALTER COLUMN id SET DEFAULT nextval('erp.employees_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.invoices ALTER COLUMN id SET DEFAULT nextval('erp.invoices_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.order_items ALTER COLUMN id SET DEFAULT nextval('erp.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.orders ALTER COLUMN id SET DEFAULT nextval('erp.orders_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.products ALTER COLUMN id SET DEFAULT nextval('erp.products_id_seq'::regclass);


--
-- Name: purchase_order_items id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.purchase_order_items ALTER COLUMN id SET DEFAULT nextval('erp.purchase_order_items_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.purchase_orders ALTER COLUMN id SET DEFAULT nextval('erp.purchase_orders_id_seq'::regclass);


--
-- Name: return_entries id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.return_entries ALTER COLUMN id SET DEFAULT nextval('erp.return_entries_id_seq'::regclass);


--
-- Name: return_entry_items id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.return_entry_items ALTER COLUMN id SET DEFAULT nextval('erp.return_entry_items_id_seq'::regclass);


--
-- Name: sale_order_items id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.sale_order_items ALTER COLUMN id SET DEFAULT nextval('erp.sale_order_items_id_seq'::regclass);


--
-- Name: sale_orders id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.sale_orders ALTER COLUMN id SET DEFAULT nextval('erp.sale_orders_id_seq'::regclass);


--
-- Name: salesmen id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.salesmen ALTER COLUMN id SET DEFAULT nextval('erp.salesmen_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.suppliers ALTER COLUMN id SET DEFAULT nextval('erp.suppliers_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.users ALTER COLUMN id SET DEFAULT nextval('erp.users_id_seq'::regclass);


--
-- Name: attendance attendance_employee_id_attendance_date_key; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.attendance
    ADD CONSTRAINT attendance_employee_id_attendance_date_key UNIQUE (employee_id, attendance_date);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: bills bills_bill_number_key; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.bills
    ADD CONSTRAINT bills_bill_number_key UNIQUE (bill_number);


--
-- Name: bills bills_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.bills
    ADD CONSTRAINT bills_pkey PRIMARY KEY (id);


--
-- Name: credit_notes credit_notes_cn_number_key; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.credit_notes
    ADD CONSTRAINT credit_notes_cn_number_key UNIQUE (cn_number);


--
-- Name: credit_notes credit_notes_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.credit_notes
    ADD CONSTRAINT credit_notes_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: daily_distributions daily_distributions_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.daily_distributions
    ADD CONSTRAINT daily_distributions_pkey PRIMARY KEY (id);


--
-- Name: deliveries deliveries_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.deliveries
    ADD CONSTRAINT deliveries_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_po_number_key; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.purchase_orders
    ADD CONSTRAINT purchase_orders_po_number_key UNIQUE (po_number);


--
-- Name: return_entries return_entries_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.return_entries
    ADD CONSTRAINT return_entries_pkey PRIMARY KEY (id);


--
-- Name: return_entries return_entries_re_number_key; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.return_entries
    ADD CONSTRAINT return_entries_re_number_key UNIQUE (re_number);


--
-- Name: return_entry_items return_entry_items_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.return_entry_items
    ADD CONSTRAINT return_entry_items_pkey PRIMARY KEY (id);


--
-- Name: sale_order_items sale_order_items_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.sale_order_items
    ADD CONSTRAINT sale_order_items_pkey PRIMARY KEY (id);


--
-- Name: sale_orders sale_orders_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.sale_orders
    ADD CONSTRAINT sale_orders_pkey PRIMARY KEY (id);


--
-- Name: sale_orders sale_orders_so_number_key; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.sale_orders
    ADD CONSTRAINT sale_orders_so_number_key UNIQUE (so_number);


--
-- Name: salesmen salesmen_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.salesmen
    ADD CONSTRAINT salesmen_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (user_id, permission);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_employee_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.attendance
    ADD CONSTRAINT attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES erp.employees(id) ON DELETE CASCADE;


--
-- Name: bills bills_po_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.bills
    ADD CONSTRAINT bills_po_id_fkey FOREIGN KEY (po_id) REFERENCES erp.purchase_orders(id);


--
-- Name: credit_notes credit_notes_invoice_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.credit_notes
    ADD CONSTRAINT credit_notes_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES erp.invoices(id);


--
-- Name: credit_notes credit_notes_so_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.credit_notes
    ADD CONSTRAINT credit_notes_so_id_fkey FOREIGN KEY (so_id) REFERENCES erp.sale_orders(id);


--
-- Name: daily_distributions daily_distributions_salesman_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.daily_distributions
    ADD CONSTRAINT daily_distributions_salesman_id_fkey FOREIGN KEY (salesman_id) REFERENCES erp.salesmen(id) ON DELETE SET NULL;


--
-- Name: deliveries deliveries_order_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.deliveries
    ADD CONSTRAINT deliveries_order_id_fkey FOREIGN KEY (order_id) REFERENCES erp.orders(id);


--
-- Name: invoices invoices_so_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.invoices
    ADD CONSTRAINT invoices_so_id_fkey FOREIGN KEY (so_id) REFERENCES erp.sale_orders(id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES erp.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES erp.products(id) ON DELETE SET NULL;


--
-- Name: purchase_order_items purchase_order_items_po_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.purchase_order_items
    ADD CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES erp.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.purchase_order_items
    ADD CONSTRAINT purchase_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES erp.products(id);


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES erp.suppliers(id);


--
-- Name: return_entries return_entries_credit_note_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.return_entries
    ADD CONSTRAINT return_entries_credit_note_id_fkey FOREIGN KEY (credit_note_id) REFERENCES erp.credit_notes(id);


--
-- Name: return_entries return_entries_so_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.return_entries
    ADD CONSTRAINT return_entries_so_id_fkey FOREIGN KEY (so_id) REFERENCES erp.sale_orders(id);


--
-- Name: return_entry_items return_entry_items_product_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.return_entry_items
    ADD CONSTRAINT return_entry_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES erp.products(id);


--
-- Name: return_entry_items return_entry_items_re_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.return_entry_items
    ADD CONSTRAINT return_entry_items_re_id_fkey FOREIGN KEY (re_id) REFERENCES erp.return_entries(id) ON DELETE CASCADE;


--
-- Name: sale_order_items sale_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.sale_order_items
    ADD CONSTRAINT sale_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES erp.products(id);


--
-- Name: sale_order_items sale_order_items_so_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.sale_order_items
    ADD CONSTRAINT sale_order_items_so_id_fkey FOREIGN KEY (so_id) REFERENCES erp.sale_orders(id) ON DELETE CASCADE;


--
-- Name: sale_orders sale_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: erp; Owner: -
--

ALTER TABLE ONLY erp.sale_orders
    ADD CONSTRAINT sale_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES erp.customers(id);


--
-- PostgreSQL database dump complete
--

\unrestrict jQ828JPO0JF0N8AYO9SPdvtDTww5VVr80lX9GFuG9AxeuCnjpr3MssSBfcdWiUp

