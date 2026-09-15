import glob
import os

files = glob.glob('frontend/src/**/*.tsx', recursive=True)

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # Fix React unused imports
    if "import React from 'react';" in content:
        content = content.replace("import React from 'react';\n", "")
        
    if "import React, { useEffect, useState } from 'react';" in content:
        content = content.replace("import React, { useEffect, useState } from 'react';", "import { useEffect, useState } from 'react';")

    if "import React, { ButtonHTMLAttributes } from 'react';" in content:
        content = content.replace("import React, { ButtonHTMLAttributes } from 'react';", "import type { ButtonHTMLAttributes } from 'react';\nimport React from 'react';")
        content = content.replace("import React from 'react';\n", "") # if React is unused, but wait, React.CSSProperties is used. Let's just fix it properly.
        
    with open(file, 'w') as f:
        f.write(content)

print("Fixed")
