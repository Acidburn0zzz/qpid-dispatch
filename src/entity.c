/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */


#include <Python.h>
#include <qpid/dispatch/error.h>
#include "dispatch_private.h"
#include "entity_private.h"

struct qd_entity_t {
    PyObject py_object;
};

void qd_entity_free(qd_entity_t* entity) {
    Py_XDECREF(entity);
}

static PyObject* qd_entity_get_py(qd_entity_t* entity, const char* attribute) {
    PyObject *py_key = PyString_FromString(attribute);
    if (!py_key) return NULL;   /* Don't set qd_error, caller will set if needed. */
    PyObject *value = PyObject_GetItem((PyObject*)entity, py_key);
    Py_DECREF(py_key);
    return value;
}

bool qd_entity_has(qd_entity_t* entity, const char *attribute) {
    PyObject *value = qd_entity_get_py(entity, attribute);
    Py_XDECREF(value);
    PyErr_Clear();              /* Ignore errors */
    return value;
}

char *qd_entity_string(qd_entity_t *entity, const char* attribute) {
    qd_error_clear();
    PyObject *py_obj = qd_entity_get_py(entity, attribute);
    PyObject *py_str = py_obj ? PyObject_Str(py_obj) : NULL;
    const char *cstr = py_str ? PyString_AsString(py_str) : NULL;
    char* str = cstr ? strdup(cstr) : NULL;
    Py_XDECREF(py_obj);
    Py_XDECREF(py_str);
    if (!str) qd_error_py();
    return str;
}

long qd_entity_long(qd_entity_t *entity, const char* attribute) {
    qd_error_clear();
    PyObject *py_obj = qd_entity_get_py(entity, attribute);
    long result = py_obj ? PyInt_AsLong(py_obj) : -1;
    Py_XDECREF(py_obj);
    qd_error_py();
    return result;
}

bool qd_entity_bool(qd_entity_t *entity, const char* attribute) {
    qd_error_clear();
    PyObject *py_obj = qd_entity_get_py(entity, attribute);
    bool result = py_obj ? PyObject_IsTrue(py_obj) : false;
    Py_XDECREF(py_obj);
    qd_error_py();
    return result;
}


char *qd_entity_opt_string(qd_entity_t *entity, const char* attribute, const char* default_value)
{
    if (qd_entity_has(entity, attribute))
	return qd_entity_string(entity, attribute);
    else
	return default_value ? strdup(default_value) : NULL;
}

long qd_entity_opt_long(qd_entity_t *entity, const char* attribute, long default_value) {
    if (qd_entity_has(entity, attribute)) {
	long result = qd_entity_long(entity, attribute);
	if (!qd_error_code())
	    return result;
    }
    return default_value;
}

bool qd_entity_opt_bool(qd_entity_t *entity, const char* attribute, bool default_value) {
    if (qd_entity_has(entity, attribute)) {
	bool result = qd_entity_bool(entity, attribute);
	if (!qd_error_code())
	    return result;
    }
    return default_value;
}


/**
 * Set a value for an entity attribute. If py_value == NULL then clear the attribute.
 * If the attribute exists and is a list, append this value to the list.
 *
 * NOTE: This function will Py_XDECREF(py_value).
 */
qd_error_t qd_entity_set_py(qd_entity_t* entity, const char* attribute, PyObject* py_value) {
    qd_error_clear();

    int result = 0;
    PyObject *py_key = PyString_FromString(attribute);
    if (py_key) {
        if (py_value == NULL) {     /* Delete the attribute */
            result = PyObject_DelItem((PyObject*)entity, py_key);
            PyErr_Clear();          /* Ignore error if it isn't there. */
        }
        else {
            PyObject *old = PyObject_GetItem((PyObject*)entity, py_key);
            PyErr_Clear();          /* Ignore error if it isn't there. */
            if (old && PyList_Check(old)) /* Add to list */
                result = PyList_Append(old, py_value);
            else                    /* Set attribute */
                result = PyObject_SetItem((PyObject*)entity, py_key, py_value);
            Py_XDECREF(old);
        }
    }
    Py_XDECREF(py_key);
    Py_XDECREF(py_value);
    return (py_key == NULL || result < 0) ? qd_error_py() : QD_ERROR_NONE;
}

qd_error_t qd_entity_set_string(qd_entity_t *entity, const char* attribute, const char *value) {
    return qd_entity_set_py(entity, attribute, value ? PyString_FromString(value) : 0);
}

qd_error_t qd_entity_set_longp(qd_entity_t *entity, const char* attribute, const long *value) {
    return qd_entity_set_py(entity, attribute, value ? PyInt_FromLong(*value) : 0);
}

qd_error_t qd_entity_set_boolp(qd_entity_t *entity, const char *attribute, const bool *value) {
    return qd_entity_set_py(entity, attribute, value ? PyBool_FromLong(*value) : 0);
}

qd_error_t qd_entity_set_long(qd_entity_t *entity, const char* attribute, long value) {
    return qd_entity_set_longp(entity, attribute, &value);
}

qd_error_t qd_entity_set_bool(qd_entity_t *entity, const char *attribute, bool value) {
    return qd_entity_set_boolp(entity, attribute, &value);
}

qd_error_t qd_entity_clear(qd_entity_t *entity, const char *attribute) {
    return qd_entity_set_py(entity, attribute, 0);
}

#define CHECK(err) if (err) return qd_error_code()

qd_error_t qd_entity_set_list(qd_entity_t *entity, const char *attribute) {
    CHECK(qd_entity_clear(entity, attribute));
    return qd_entity_set_py(entity, attribute, PyList_New(0));
}

qd_error_t qd_entity_set_stringf(qd_entity_t *entity, const char* attribute, const char *format, ...)
{
    // Calculate the size
    char dummy[1];
    va_list ap;
    va_start(ap, format);
    int len = vsnprintf(dummy, 1, format, ap);
    va_end(ap);

    char buf[len+1];
    va_start(ap, format);
    vsnprintf(buf, len+1, format, ap);
    va_end(ap);

    return qd_entity_set_string(entity, attribute, buf);
}