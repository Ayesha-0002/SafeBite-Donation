with open('src/pages/ngo/ManageVolunteers.tsx', 'r') as f:
    content = f.read()

content = content.replace('''  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, fetchRequests]);

  const fetchRequests = useCallback(async () => {''', '''  const fetchRequests = useCallback(async () => {''')

content = content.replace('''      setLoading(false);
    }
  }, [user?.id]);''', '''      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, fetchRequests]);''')

with open('src/pages/ngo/ManageVolunteers.tsx', 'w') as f:
    f.write(content)
