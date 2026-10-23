/** Portfolio-only rules injected by the shared renderer; do not add studio chrome here. */
export const portfolioCss = `.folio .folio__skills-grid{
	row-gap:40px;
	column-gap:32px
}
.folio__skill-group{
	display:grid;
	align-content:start;
	gap:16px
}
.folio__skill-group>.folio__tags{
	margin:0
}
.folio[dir="rtl"]{
	text-align:right
}
.folio[dir="ltr"]{
	text-align:left
}
.folio,.folio *{
	box-sizing:border-box
}
.folio{
	background:var(--folio-bg);
	color:var(--folio-text);
	line-height:1.65;
	overflow-wrap:anywhere;
	isolation:isolate;
	container-type:inline-size;
	container-name:folio
}
.folio a{
	color:inherit;
	text-decoration:none
}
.folio button,.folio summary{
	font:inherit
}
.folio a:focus-visible,.folio summary:focus-visible{
	outline:3px solid var(--folio-accent);
	outline-offset:5px
}
.folio__wrap{
	max-width:1160px;
	margin-inline:auto;
	padding:0 64px
}
.folio__nav{
	display:flex;
	align-items:center;
	justify-content:space-between;
	gap:24px;
	padding-block:30px;
	border-bottom:1px solid var(--folio-border)
}
.folio__brand{
	display:flex;
	align-items:center;
	gap:12px;
	font-weight:700;
	letter-spacing:-.03em
}
.folio__brand-mark{
	width:17px;
	height:17px;
	background:var(--folio-accent);
	border-radius:5px;
	transform:rotate(-12deg);
	flex-shrink:0
}
.folio__nav-links{
	display:flex;
	gap:26px;
	font-size:max(13px,.82em);
	font-weight:600
}
.folio__nav-links a{
	display:inline-flex;
	align-items:center;
	min-height:44px
}
.folio__nav a:hover,.folio__text-link:hover,.folio__contact a:hover{
	text-decoration:underline;
	text-underline-offset:5px
}
.folio__hero{
	display:flex;
	gap:42px;
	align-items:flex-start;
	padding-block:90px 96px
}
.folio__identity{
	width:104px;
	height:104px;
	flex-shrink:0;
	border-radius:50%;
	display:grid;
	place-items:center;
	font-weight:600;
	font-size:2em;
	color:var(--folio-accent);
	background:var(--folio-soft);
	border:1px solid var(--folio-border);
	margin-top:18px
}
.folio__identity-empty{
	font-size:1.4em
}
.folio__hero-copy{
	max-width:710px
}
.folio__availability{
	display:inline-flex;
	align-items:center;
	gap:8px;
	color:var(--folio-muted);
	font-size:max(13px,.75em);
	margin-bottom:22px;
	border:1px solid var(--folio-border);
	padding:5px 12px;
	border-radius:99px;
	background:var(--folio-surface)
}
.folio__availability span{
	width:7px;
	height:7px;
	border-radius:50%;
	background:var(--folio-accent)
}
.folio h1,.folio h2,.folio h3,.folio p{
	margin:0
}
.folio h1{
	font-size:clamp(2.5em,5cqw,4.3em);
	line-height:1.13;
	letter-spacing:-.045em;
	font-weight:650
}
.folio__period{
	color:var(--folio-accent)
}
.folio__role{
	font-size:1.25em;
	margin-top:18px!important;
	font-weight:500
}
.folio__bio{
	margin-top:22px!important;
	max-width:650px;
	white-space:pre-wrap;
	color:var(--folio-muted);
	font-size:1.03em
}
.folio__location{
	margin-top:18px!important;
	font-size:max(13px,.82em);
	color:var(--folio-muted)
}
.folio__hero-links{
	display:flex;
	align-items:center;
	flex-wrap:wrap;
	gap:24px;
	margin-top:30px
}
.folio__button{
	background:var(--folio-text);
	color:var(--folio-bg)!important;
	display:inline-flex;
	align-items:center;
	gap:15px;
	padding:12px 20px;
	border-radius:9px;
	font-size:max(13px,.83em);
	font-weight:600
}
.folio__button:hover{
	background:var(--folio-accent);
	color:var(--folio-bg)!important
}
.folio__text-link{
	display:inline-flex;
	align-items:center;
	min-block-size:24px;
	font-size:max(13px,.83em);
	font-weight:600
}
.folio__work{
	padding-block:46px 74px;
	border-top:1px solid var(--folio-border);
	scroll-margin-top:24px
}
.folio__section-heading{
	display:flex;
	justify-content:space-between;
	align-items:flex-end;
	gap:20px;
	margin-bottom:30px
}
.folio__eyebrow{
	font-size:max(13px,.66em);
	letter-spacing:.1em;
	font-weight:600;
	color:var(--folio-muted);
	margin-bottom:10px!important
}
.folio h2{
	font-size:2em;
	line-height:1.2;
	letter-spacing:-.035em;
	font-weight:600
}
.folio__section-heading>p{
	font-size:max(13px,.85em);
	color:var(--folio-muted)
}
.folio__grid{
	display:grid;
	grid-template-columns:repeat(2,minmax(0,1fr));
	gap:30px
}
.folio__project{
	background:var(--folio-surface);
	border:1px solid var(--folio-border);
	border-radius:16px;
	overflow:hidden;
	align-self:start
}
.folio__art{
	height:205px;
	position:relative;
	background:var(--folio-soft);
	overflow:hidden;
	display:grid;
	place-items:center;
	border-bottom:1px solid var(--folio-border)
}
.folio__art-shape{
	width:105px;
	height:105px;
	background:var(--folio-accent);
	border-radius:25px;
	transform:rotate(-18deg);
	opacity:.85;
	box-shadow:18px 18px 0 var(--folio-surface)
}
.folio__art-orbit{
	position:absolute;
	width:215px;
	height:215px;
	border:1px solid var(--folio-accent);
	border-radius:50%;
	opacity:.25;
	transform:translate(12px,15px)
}
.folio__art--1 .folio__art-shape{
	border-radius:50%;
	transform:translate(22px,10px);
	box-shadow:-38px -18px 0 var(--folio-surface)
}
.folio__art--1 .folio__art-orbit{
	width:170px;
	height:170px;
	border-radius:30px;
	transform:rotate(25deg)
}
.folio__art--2 .folio__art-shape{
	width:90px;
	height:130px;
	border-radius:50px 50px 14px 14px;
	transform:rotate(18deg);
	box-shadow:-28px 8px 0 var(--folio-surface)
}
.folio__art-number{
	position:absolute;
	inset-inline-start:20px;
	bottom:12px;
	color:var(--folio-muted);
	font-size:max(13px,.7em);
	letter-spacing:.12em
}
.folio__project-copy{
	padding:24px
}
.folio__project-meta{
	display:flex;
	justify-content:space-between;
	color:var(--folio-muted);
	font-size:max(13px,.7em);
	margin-bottom:8px
}
.folio h3{
	font-size:1.2em;
	line-height:1.4;
	letter-spacing:-.02em;
	font-weight:600
}
.folio__summary{
	font-size:max(13px,.86em);
	color:var(--folio-muted);
	margin-top:12px!important;
	white-space:pre-wrap
}
.folio__details{
	margin-top:22px;
	border-top:1px solid var(--folio-border)
}
.folio__details summary{
	cursor:pointer;
	padding-block:13px;
	font-size:max(13px,.78em);
	font-weight:600;
	display:flex;
	justify-content:space-between;
	gap:15px;
	list-style:none
}
.folio__details summary::-webkit-details-marker{
	display:none
}
.folio__details[open] summary span{
	transform:rotate(45deg)
}
.folio__detail-body{
	padding-bottom:12px;
	font-size:max(13px,.84em)
}
.folio dl{
	margin:0 0 16px;
	display:grid;
	gap:12px
}
.folio dt{
	font-size:max(13px,.8em);
	color:var(--folio-muted)
}
.folio dd{
	margin:2px 0 0
}
.folio__body{
	white-space:pre-wrap;
	color:var(--folio-muted)
}
.folio__project-actions{
	display:flex;
	align-items:center;
	flex-wrap:wrap;
	gap:8px 16px;
	margin-block:12px
}
.folio__project-actions>.folio__project-link{
	margin-top:0
}
.folio__project-link{
	display:inline-flex;
	gap:14px;
	color:var(--folio-accent)!important;
	font-size:max(13px,.8em);
	font-weight:600;
	margin-top:15px
}
.folio .folio__arrow-link{
	display:inline-flex;
	align-items:center;
	gap:8px;
	min-block-size:24px
}
.folio__project-link:hover{
	text-decoration:underline;
	text-underline-offset:4px
}
.folio__empty{
	text-align:center;
	border:1px dashed var(--folio-border);
	border-radius:16px;
	padding:40px 24px;
	color:var(--folio-muted)
}
.folio__empty>span{
	font-size:2em;
	color:var(--folio-accent)
}
.folio__empty h3{
	color:var(--folio-text);
	margin-top:12px
}
.folio__empty p{
	max-width:450px;
	margin:10px auto 0;
	font-size:max(13px,.85em)
}
.folio__contact{
	border-top:1px solid var(--folio-border);
	padding-block:58px 72px;
	scroll-margin-top:24px
}
.folio__contact h2{
	font-size:2.7em
}
.folio__contact>p:not(.folio__eyebrow){
	color:var(--folio-muted);
	margin-top:16px;
	font-size:max(13px,.9em)
}
.folio__contact-links{
	display:flex;
	flex-wrap:wrap;
	gap:28px;
	margin-top:25px;
	font-size:max(13px,.95em);
	font-weight:600
}
.folio__contact-links a{
	display:inline-flex;
	gap:18px;
	align-items:center
}
.folio__footer{
	display:flex;
	justify-content:space-between;
	gap:24px;
	border-top:1px solid var(--folio-border);
	padding-block:24px 30px;
	color:var(--folio-muted);
	font-size:max(13px,.72em)
}
.folio--compact .folio__wrap{
	padding-inline:32px
}
.folio--compact .folio__hero{
	gap:26px;
	padding-block:55px 60px
}
.folio--compact .folio__identity{
	width:75px;
	height:75px;
	font-size:1.5em
}
.folio--compact h1{
	font-size:2.9em
}
.folio--compact .folio__art{
	height:155px
}
.folio--compact .folio__project-copy{
	padding:18px
}
.folio--compact .folio__grid{
	gap:20px
}
.folio--compact .folio__section-heading{
	display:block
}
.folio--compact .folio__section-heading>p{
	margin-top:12px
}
.folio--compact .folio__nav-links{
	gap:16px
}
.folio__avatar{
	width:100%;
	height:100%;
	border-radius:50%;
	object-fit:cover
}
.folio__cover{
	width:100%;
	height:100%;
	object-fit:cover
}
.folio__article-cover{
	display:block;
	width:100%;
	aspect-ratio:2/1;
	object-fit:cover
}
.folio__tag{
	display:inline-block;
	padding:4px 10px;
	border:1px solid var(--folio-border);
	border-radius:99px;
	font-size:max(13px,.75em);
	background:var(--folio-soft);
	margin-block:10px
}
.folio__tags{
	list-style:none;
	padding:0;
	display:flex;
	gap:8px;
	flex-wrap:wrap
}
.folio__tags .folio__tag{
	margin:0
}
.folio__timeline{
	display:grid;
	gap:28px
}
.folio__entry{
	border-inline-start:2px solid var(--folio-accent);
	padding-inline-start:24px
}
.folio__entry .folio__body{
	margin-top:16px
}
.folio__rich{
	display:grid;
	gap:18px;
	margin-block:22px;
	white-space:pre-wrap
}
.folio__rich h2{
	font-size:1.6em
}
.folio__rich ul,.folio__rich ol{
	margin:0;
	padding-inline-start:24px;
	white-space:normal
}
.folio__rich ul,.folio__entry>ul:not(.folio__tags){
	list-style-type:disc
}
.folio__rich ol{
	list-style-type:decimal
}
.folio__entry>ul:not(.folio__tags){
	padding-inline-start:24px;
	margin-block:16px
}
.folio__gallery{
	display:grid;
	grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));
	gap:16px;
	margin-block:24px
}
.folio__gallery img{
	display:block;
	width:100%;
	height:auto;
	border-radius:10px
}
.folio__detail-page{
	padding-block:56px 64px;
	max-width:850px;
	margin-inline:auto
}
.folio__detail-page h1{
	font-size:clamp(2em,5cqw,3.5em);
	margin-top:24px
}
.folio__detail-page>.folio__eyebrow{
	margin-top:24px
}
.folio__detail-page dl{
	margin-block:24px
}
.folio__detail-cover{
	display:block;
	width:100%;
	max-height:500px;
	object-fit:contain;
	border-radius:16px;
	margin-block:32px
}
.folio__inquiry{
	display:grid;
	gap:18px;
	max-width:620px;
	margin-top:32px
}
.folio__inquiry label{
	display:grid;
	gap:7px;
	font-size:max(13px,.85em);
	font-weight:600
}
.folio__inquiry input,.folio__inquiry textarea{
	width:100%;
	border:1px solid var(--folio-border);
	background:var(--folio-surface);
	color:var(--folio-text);
	font:inherit;
	border-radius:9px;
	padding:12px
}
.folio__inquiry input,.folio__inquiry textarea{
	font-size:max(16px,1em)
}
.folio__inquiry textarea{
	resize:vertical
}
.folio__inquiry button{
	justify-self:start;
	border:0;
	cursor:pointer
}
.folio__inquiry button:disabled{
	opacity:.6;
	cursor:wait
}
.folio__inquiry input:focus-visible,.folio__inquiry textarea:focus-visible,.folio__inquiry button:focus-visible{
	outline:3px solid var(--folio-accent);
	outline-offset:3px
}
.folio__form-status{
	font-size:max(13px,.85em)
}
.folio__honeypot{
	position:absolute;
	width:1px;
	height:1px;
	overflow:hidden;
	clip-path:inset(50%)
}
.folio__eyebrow,.folio__project-meta,.folio__footer,.folio__form-status{
	font-size:max(13px,.75em)
}
.folio__nav-links{
	font-size:max(13px,.875em)
}
.folio__summary{
	font-size:max(13px,.95em)
}
@container folio (max-width:700px){
	.folio__wrap,.folio--compact .folio__wrap{
		padding-inline:24px
	}
	.folio__nav{
		padding-block:22px;
		gap:14px;
		flex-wrap:wrap
	}
	.folio__nav-links{
		gap:20px
	}
	.folio__hero,.folio--compact .folio__hero{
		display:block;
		padding-block:45px 50px
	}
	.folio__identity,.folio--compact .folio__identity{
		width:72px;
		height:72px;
		font-size:1.4em;
		margin:0 0 25px
	}
	.folio h1,.folio--compact h1{
		font-size:2.7em
	}
	.folio__role{
		font-size:1.1em
	}
	.folio__bio{
		font-size:max(13px,.95em)
	}
	.folio__section-heading{
		display:block
	}
	.folio__section-heading>p{
		margin-top:12px
	}
	.folio__grid{
		grid-template-columns:1fr
	}
	.folio__work{
		padding-block:32px 45px
	}
	.folio__art,.folio--compact .folio__art{
		height:185px
	}
	.folio__contact{
		padding-block:40px 45px
	}
	.folio__contact h2{
		font-size:2.2em
	}
	.folio__contact-links{
		display:grid;
		gap:16px
	}
	.folio__footer{
		font-size:max(13px,.75em)
	}
	.folio__hero-links{
		gap:18px
	}
	
}

`;
