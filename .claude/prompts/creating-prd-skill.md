# New skill - creating prd skill

## Task 
 to make a new skill for creating prd files (product requirements document). The skill must accept a feature name, which will be used for a name of a generated prd file, placed in
  "/docs/prds/{featureName}.md", using kebab case (if the folder does not exist, then create it).
  The prd file must consist of:
  Title: #PRD {featureName}
  Date: the current date
  Status: Draft (in order to observe a feature status)
  ##Aim 1-2 sentences describing what and why a user needs this feature. 
  ##Use cases
   - a user {action} => {result}
   ##Scope: a list of what is included in the feature
   ##Not included in scope: What we explicitly must not do;
   ##Technical restrictions: a list of restrictions that must be taken into account
   ##Definition of Done(DOD):
    - [ ] item 1
    - [ ] item 2
   ##Rules
   - Write a prd file without the fluff
   - DoDs must be available to check
   - Do not describe how to implement, only what and why
   - If the desciption is short, ask questions untill you completely understand what must be implemented
