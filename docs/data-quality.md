# Dataset provenance and cleaning policy

Source: the unmodified `veridia_csv.csv` supplied with the assignment. It contains 1,000 manufacturer rows and 31 columns. `npm run data:prepare` parses quoted CSV with Papa Parse, normalizes typed fields and semicolon lists, validates the output with Zod, and writes `data/prepared.json` and `data/quality.json`. The SHA-256 of the original bytes identifies the dataset; generation has no clock-dependent output.

Each normalized record retains every original field in `raw`, its original CSV row number (header is row 1), normalized values, issue codes and quarantine status. No source row is deleted or overwritten. Blank or invalid metrics remain `null`, not zero. Identity and critical capability/order defects are quarantined conservatively; missing secondary metrics can be evaluated with explicit unknowns.

| Observed issue | Affected rows | Treatment |
| --- | ---: | --- |
| Ten IDs each assigned to two different companies | 20 | Quarantine every occurrence; retain names, capabilities and source rows |
| Both lead-time fields blank | 10 | Unknown timing; no confirmed deadline match; separately labelled needs confirmation when other conditions permit |
| On-time delivery above 100% (105.5–142.6%) | 10 | Preserve raw value; normalized percentage is unavailable and cannot improve rank |
| Certificate expiry before 27 October 2026 | 2 | Dynamic eligibility against the request's date and estimated completion, not a hardcoded exclusion list |

This leaves 980 unambiguous records before request-specific checks. Issue counts describe affected rows and may overlap. The preparation step deliberately does not label “expired today” as an immutable normalization issue: expiry belongs to the matching date policy.

The supplied snapshot has nine material labels, nine process labels and five certificate labels. Every row lists India and active status. Populated days/weeks, list counts and numeric/displayed order ranges agree in the original source. Date fields are parseable. Tests also exercise malformed CSV, unsupported labels, invalid dates, conflicting lead times, mismatched counts and invalid order ranges for future inputs. Structurally malformed CSV or unsupported headers fail preparation explicitly.

Explicit alias handling maps aluminum to aluminium and normalizes list whitespace/case to the supported vocabulary. This is deterministic input handling, not AI. A primary process outside the listed processes or mismatched list counts is quarantined. Inconsistent days/weeks become unknown. When just one valid lead-time field is populated, the other representation is derived in whole calendar days. Numeric capacity/export defects become unknown and remain visible as issues.

## Limits of interpretation

- Separate material and process lists cannot prove compatibility on a specific production line. Grades, drawings, surface finish and tolerances are absent.
- One manufacturer-level certificate expiry is assumed to apply to all listed certificates. There are no individual certificate documents, issuance histories or verified authenticity checks.
- Lead time is interpreted as production calendar days. Estimated completion assumes work starts on the frozen evaluation date. The file does not provide shipping, customs, start dates or booked capacity.
- Monthly capacity is nominal. General export experience does not prove experience with Germany or another selected destination.
- On-time delivery has no underlying sample counts or independently verified period. Valid percentages are usable only as supplied contextual ranking evidence.
- Contact details use example domains and are mock information. No email or supplier contact is sent.
- Past/future dates evaluate the supplied snapshot; they do not establish historical status or future availability.

At 27 October 2026, using 42 production days and validity through completion, Buyer A has 33 preliminary candidates; Buyer B has VM1006 only. Both require supplier confirmation of the unknowns above.
