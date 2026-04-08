-- ============================================================
-- TheCrowsNest — Add placeholder syllabuses to generic classes
-- Only updates rows where syllabus IS NULL (preserves manually
-- created class syllabuses that already have content).
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

UPDATE classes SET syllabus = $syl$
Course Overview:
CSCI 1010 introduces foundational programming concepts using a high-level language. Students learn to decompose problems into logical steps and translate solutions into working code.

Topics Covered:
- Problem decomposition and algorithm design
- Pseudocode and flowcharts
- Variables, data types, and operators
- Control structures: conditionals (if/else) and loops (for, while)
- Functions and parameter passing
- Basic input/output and file handling
- Introduction to debugging and testing
- Arrays and simple data manipulation

Learning Outcomes:
By the end of this course, students will be able to write, test, and debug simple programs; design algorithms for common computational problems; and apply structured programming principles.
$syl$
WHERE class_id = 'csci1010' AND syllabus IS NULL;

UPDATE classes SET syllabus = $syl$
Course Overview:
CSCI 2540 covers object-oriented programming principles and foundational data structures. Students build on introductory programming skills to design and implement reusable, efficient software components.

Topics Covered:
- Classes, objects, encapsulation, inheritance, and polymorphism
- Abstract classes and interfaces
- Linked lists (singly, doubly, circular)
- Stacks and queues (array and linked implementations)
- Recursion and recursive problem solving
- Binary trees and binary search trees
- Sorting algorithms (selection, insertion, merge, quicksort)
- Algorithm analysis and Big-O notation
- Exception handling and file I/O

Learning Outcomes:
Students will apply OOP design principles to real-world problems, implement and analyze core data structures, and evaluate algorithm efficiency using asymptotic notation.
$syl$
WHERE class_id = 'csci2540' AND syllabus IS NULL;

UPDATE classes SET syllabus = $syl$
Course Overview:
CSCI 2530 explores how high-level programs are executed at the hardware level. Students learn computer architecture fundamentals and low-level programming using assembly language.

Topics Covered:
- Number systems: binary, octal, hexadecimal, and two"'"s complement
- Boolean algebra and digital logic gates
- CPU architecture: ALU, registers, control unit, memory
- Instruction set architecture (ISA)
- Assembly language programming (x86 or MIPS)
- Memory addressing modes and stack operations
- Subroutine calls and parameter passing in assembly
- Memory hierarchy: cache, RAM, and virtual memory
- I/O systems and interrupts

Learning Outcomes:
Students will write and debug assembly language programs, describe the relationship between hardware and software, and explain how high-level constructs map to machine instructions.
$syl$
WHERE class_id = 'csci2530' AND syllabus IS NULL;

UPDATE classes SET syllabus = $syl$
Course Overview:
CSCI 3310 provides a rigorous introduction to the theoretical foundations of computer science, covering formal models of computation and the limits of what can be computed.

Topics Covered:
- Deterministic and nondeterministic finite automata (DFA/NFA)
- Regular expressions and the equivalence with finite automata
- Closure properties of regular languages; pumping lemma
- Context-free grammars (CFG) and pushdown automata (PDA)
- Chomsky normal form; CYK parsing algorithm
- Turing machines: definition, variants, and Church-Turing thesis
- Decidability: halting problem, reduction proofs
- Introduction to complexity theory: P, NP, NP-completeness

Learning Outcomes:
Students will construct formal models for language recognition, prove properties of language classes, and understand the fundamental limits of algorithmic computation.
$syl$
WHERE class_id = 'csci3310' AND syllabus IS NULL;

UPDATE classes SET syllabus = $syl$
Course Overview:
CSCI 3610 covers the principles underlying modern computer networks, from physical transmission to application-layer protocols, with an emphasis on the TCP/IP suite.

Topics Covered:
- Network models: OSI and TCP/IP layered architectures
- Physical and data link layers: framing, error detection, MAC protocols
- Ethernet and Wi-Fi (IEEE 802.3 / 802.11)
- IP addressing, subnetting (CIDR), and IPv4 vs IPv6
- Routing protocols: RIP, OSPF, BGP
- Transport layer: UDP, TCP, flow control, and congestion control
- Application-layer protocols: HTTP, DNS, SMTP, FTP
- Network security fundamentals: firewalls, TLS, VPN
- Socket programming in Python or C

Learning Outcomes:
Students will explain the function of each network layer, analyze packet traces, configure basic routing and addressing, and write simple networked client-server applications.
$syl$
WHERE class_id = 'csci3610' AND syllabus IS NULL;

UPDATE classes SET syllabus = $syl$
Course Overview:
MATH 1065 provides the algebraic foundations required for calculus and quantitative courses across many disciplines. Emphasis is placed on function analysis and equation solving.

Topics Covered:
- Real number system, properties, and interval notation
- Functions: definition, domain, range, and composition
- Linear, quadratic, polynomial, and rational functions
- Absolute value equations and inequalities
- Exponential and logarithmic functions and their properties
- Systems of linear equations: substitution, elimination, matrices
- Sequences, series, and basic combinatorics
- Conic sections: parabolas, ellipses, and hyperbolas

Learning Outcomes:
Students will evaluate and manipulate a variety of function types, solve equations and inequalities algebraically and graphically, and apply algebraic reasoning to applied problems.
$syl$
WHERE class_id = 'math1065' AND syllabus IS NULL;

UPDATE classes SET syllabus = $syl$
Course Overview:
MATH 2119 introduces the core concepts of linear algebra, providing tools essential for computer science, engineering, data science, and the natural sciences.

Topics Covered:
- Systems of linear equations and Gaussian elimination
- Matrix operations: addition, multiplication, transpose, and inverse
- Determinants and Cramer"'"s rule
- Vector spaces and subspaces
- Linear independence, basis, and dimension
- Linear transformations and their matrix representations
- Eigenvalues and eigenvectors; diagonalization
- Orthogonality, projections, and Gram-Schmidt process
- Applications: Markov chains, least-squares, and data fitting

Learning Outcomes:
Students will solve linear systems, perform matrix decompositions, and apply concepts of vector spaces and linear transformations to problems in mathematics and its applications.
$syl$
WHERE class_id = 'math2119' AND syllabus IS NULL;

UPDATE classes SET syllabus = $syl$
Course Overview:
MATH 2171 is the first semester of the calculus sequence. It develops the concepts of limits, derivatives, and the Riemann integral for single-variable functions.

Topics Covered:
- Limits: definition, limit laws, continuity, and the squeeze theorem
- The derivative: definition, interpretations, and basic rules
- Product, quotient, and chain rules
- Implicit differentiation and related rates
- Higher-order derivatives and concavity
- Mean value theorem and applications
- Optimization: local and global extrema
- Curve sketching with calculus tools
- Antiderivatives and indefinite integrals
- Riemann sums and the definite integral
- Fundamental Theorem of Calculus
- Substitution rule for integration

Learning Outcomes:
Students will compute derivatives and integrals of single-variable functions, apply calculus tools to optimization and rate problems, and interpret results graphically and in context.
$syl$
WHERE class_id = 'math2171' AND syllabus IS NULL;

UPDATE classes SET syllabus = $syl$
Course Overview:
MATH 2172 continues the calculus sequence with advanced integration techniques, infinite series, and introductory topics in multivariable calculus.

Topics Covered:
- Integration by parts, trigonometric substitution, and partial fractions
- Improper integrals: definition and convergence
- Applications of integration: area, volume, arc length, surface area
- Sequences: convergence, monotonicity, and boundedness
- Infinite series: geometric, p-series, alternating, and power series
- Convergence tests: integral, comparison, ratio, and root tests
- Taylor and Maclaurin series; radius of convergence
- Parametric curves and calculus in parametric form
- Polar coordinates and area in polar form
- Introduction to vectors and 3D geometry

Learning Outcomes:
Students will apply advanced integration techniques, determine convergence of series, represent functions as power series, and work fluently with parametric and polar representations.
$syl$
WHERE class_id = 'math2172' AND syllabus IS NULL;

UPDATE classes SET syllabus = $syl$
Course Overview:
ENGL 1100 develops college-level writing skills through structured composition practice. Students learn to construct coherent, well-supported arguments and engage critically with source material.

Topics Covered:
- The writing process: prewriting, drafting, revising, and editing
- Thesis development and argumentation
- Paragraph structure and logical organization
- Rhetorical analysis of texts
- Integrating and citing sources (MLA and APA)
- Avoiding plagiarism; academic integrity
- Research strategies: evaluating sources, databases
- Peer review workshops and revision techniques
- Grammar, mechanics, and style for academic writing
- Summary, paraphrase, and direct quotation

Learning Outcomes:
Students will produce clear, argumentative essays with appropriate source integration; apply revision strategies based on instructor and peer feedback; and demonstrate proficiency in academic citation conventions.
$syl$
WHERE class_id = 'engl1100' AND syllabus IS NULL;

UPDATE classes SET syllabus = $syl$
Course Overview:
BIOL 1050 introduces the fundamental principles of biology at the cellular and molecular level, providing the groundwork for advanced study in the biological sciences.

Topics Covered:
- Scientific method and experimental design
- Chemistry of life: water, macromolecules (carbohydrates, proteins, lipids, nucleic acids)
- Cell structure: prokaryotic vs. eukaryotic cells, organelles
- Membrane structure and transport (osmosis, diffusion, active transport)
- Cellular respiration: glycolysis, Krebs cycle, oxidative phosphorylation
- Photosynthesis: light-dependent and Calvin cycle reactions
- Cell cycle: mitosis and cytokinesis
- Mendelian genetics: laws of segregation and independent assortment
- DNA structure, replication, transcription, and translation (central dogma)
- Mutation, gene regulation, and basic biotechnology
- Evolution: natural selection, adaptation, speciation
- Introduction to ecology: populations, communities, and ecosystems

Learning Outcomes:
Students will explain cellular processes at the molecular level, apply Mendelian inheritance to predict offspring ratios, and describe evolutionary mechanisms and their ecological consequences.
$syl$
WHERE class_id = 'biol1050' AND syllabus IS NULL;

UPDATE classes SET syllabus = $syl$
Course Overview:
BIOL 1051 extends the foundational biology concepts of BIOL 1050 to the organismal level, examining the diversity of life and the physiological systems that sustain it.

Topics Covered:
- Classification and taxonomy: the domains and kingdoms of life
- Viruses, prokaryotes, and protists: structure and ecological roles
- Plant biology: structure, photosynthesis, reproduction, and growth
- Fungi: structure, life cycles, and ecological importance
- Animal body plans: symmetry, coelom, and major invertebrate phyla
- Vertebrate evolution and major vertebrate groups
- Animal physiology: digestive, circulatory, respiratory, excretory, nervous, and endocrine systems
- Animal reproduction and development
- Behavior: innate vs. learned, communication, and social behavior
- Biodiversity, conservation biology, and human environmental impact

Learning Outcomes:
Students will compare the structural and functional diversity of major organismal groups, explain key physiological systems, and evaluate the impact of human activity on biodiversity.
$syl$
WHERE class_id = 'biol1051' AND syllabus IS NULL;

UPDATE classes SET syllabus = $syl$
Course Overview:
CHEM 1150 introduces the fundamental concepts of chemistry, providing the quantitative and conceptual foundation required for advanced courses in chemistry, biology, and the health sciences.

Topics Covered:
- Matter and measurement: SI units, significant figures, dimensional analysis
- Atomic theory and atomic structure: protons, neutrons, electrons, isotopes
- The periodic table: trends in atomic radius, ionization energy, and electronegativity
- Chemical bonding: ionic, covalent, and metallic bonds; Lewis structures
- Molecular geometry and VSEPR theory; polarity
- Nomenclature of ionic and covalent compounds
- Stoichiometry: mole concept, molar mass, and limiting reagents
- Types of chemical reactions: synthesis, decomposition, combustion, acid-base
- Aqueous solutions: molarity, precipitation, and net ionic equations
- Gas laws: Boyle's, Charles's, ideal gas law, and Dalton's law
- Thermochemistry: enthalpy, Hess's law, and calorimetry

Learning Outcomes:
Students will apply stoichiometric reasoning to quantitative chemical problems, predict bonding and molecular geometry, classify reaction types, and perform basic thermochemical calculations.
$syl$
WHERE class_id = 'chem1150' AND syllabus IS NULL;

UPDATE classes SET syllabus = $syl$
Course Overview:
ACCT 2401 introduces the language and principles of financial accounting, equipping students to prepare, read, and analyze financial statements used by businesses and organizations.

Topics Covered:
- The accounting equation: assets, liabilities, and equity
- Double-entry bookkeeping and journal entries
- The accounting cycle: journalizing, posting, trial balance, adjusting entries
- Cash vs. accrual basis accounting
- Financial statements: income statement, statement of equity, balance sheet, cash flow statement
- Generally Accepted Accounting Principles (GAAP)
- Revenue recognition and matching principle
- Inventory valuation methods: FIFO, LIFO, and weighted average
- Accounts receivable and bad debt estimation
- Property, plant, and equipment; depreciation methods
- Introduction to liabilities: accounts payable, notes payable, and bonds

Learning Outcomes:
Students will apply the full accounting cycle to record and summarize business transactions, prepare and interpret fundamental financial statements, and evaluate accounting choices under GAAP.
$syl$
WHERE class_id = 'acct2401' AND syllabus IS NULL;

UPDATE classes SET syllabus = $syl$
Course Overview:
MGT 3303 introduces the four core functions of management and equips students with the conceptual tools to analyze and improve organizational effectiveness in a variety of contexts.

Topics Covered:
- Evolution of management thought: classical, behavioral, and modern approaches
- Planning: mission, vision, strategic vs. operational goals, and SWOT analysis
- Organizing: organizational structure, departmentalization, span of control, and delegation
- Staffing: human resource management, recruitment, selection, and training
- Leading: motivation theories (Maslow, Herzberg, expectancy), leadership styles, and communication
- Controlling: performance measurement, feedback systems, and balanced scorecard
- Decision-making: rational, bounded rationality, and ethical decision frameworks
- Organizational culture and change management
- Teamwork, group dynamics, and conflict resolution
- Corporate social responsibility and business ethics
- Global management and cross-cultural considerations

Learning Outcomes:
Students will apply the planning-organizing-leading-controlling framework to case studies, evaluate leadership and motivation strategies, and develop solutions to common managerial challenges.
$syl$
WHERE class_id = 'mgt3303' AND syllabus IS NULL;

UPDATE classes SET syllabus = $syl$
Course Overview:
NURS 1001 provides an orientation to the nursing profession, its history, scope of practice, and the standards that govern safe and ethical patient care.

Topics Covered:
- History of nursing: Florence Nightingale to contemporary practice
- Professional nursing roles: RN, APN, LPN/LVN, CNS, NP
- Nursing licensure, scope of practice, and the Nurse Practice Act
- Professional nursing organizations and accreditation bodies
- Healthcare delivery systems: hospitals, clinics, long-term care, and community health
- Ethical principles in nursing: beneficence, non-maleficence, autonomy, and justice
- Legal issues: negligence, malpractice, informed consent, and patient rights
- Therapeutic communication techniques
- Introduction to the nursing process: assessment, diagnosis, planning, implementation, evaluation (ADPIE)
- Patient safety and quality improvement (QSEN competencies)
- Cultural competence and patient-centered care
- Self-care and professional well-being for nurses

Learning Outcomes:
Students will articulate the professional standards and ethical obligations of registered nurses, describe major healthcare delivery models, and apply the nursing process as a systematic framework for patient care.
$syl$
WHERE class_id = 'nurs1001' AND syllabus IS NULL;

UPDATE classes SET syllabus = $syl$
Course Overview:
PSYC 1000 is a broad survey of the scientific study of behavior and mental processes. It introduces students to the major content areas and research methods of psychology.

Topics Covered:
- History of psychology and major theoretical perspectives (behaviorism, cognitive, humanistic, biological, sociocultural)
- Research methods: experimental design, correlation, surveys, and ethical guidelines
- Biological bases of behavior: neurons, neurotransmitters, brain structure, and genetics
- Sensation and perception: sensory systems and perceptual interpretation
- States of consciousness: sleep, dreaming, and altered states
- Learning: classical conditioning, operant conditioning, and observational learning
- Memory: encoding, storage, retrieval, and forgetting
- Cognition, language, and problem solving
- Developmental psychology: lifespan development (Piaget, Erikson)
- Motivation and emotion: theories and physiological correlates
- Personality: psychodynamic, humanistic, trait, and social-cognitive theories
- Social psychology: attitudes, persuasion, conformity, obedience, and group behavior
- Psychological disorders: classification (DSM-5), mood, anxiety, schizophrenia, personality disorders
- Treatment approaches: psychotherapy, cognitive-behavioral therapy, and pharmacotherapy

Learning Outcomes:
Students will describe major psychological theories and their historical context, apply research methods to evaluate psychological claims, and explain biological and social influences on human behavior and mental health.
$syl$
WHERE class_id = 'psyc1000' AND syllabus IS NULL;
